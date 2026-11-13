import argon2 from "argon2";
import type { PrismaClient, AdminRole } from "@prisma/client";
import { AppError } from "../errors.js";
import {
  createTotpUri,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
} from "./admin-crypto.js";

export class AdminOperationsService {
  constructor(
    private readonly db: PrismaClient,
    private readonly encryptionKey: string
  ) {}

  async getPurchases() {
    const [suppliers, invoices] = await Promise.all([
      this.db.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      this.db.purchaseInvoice.findMany({
        orderBy: { invoiceDate: "desc" },
        take: 100,
        include: {
          supplier: true,
          lines: { include: { variant: { include: { product: { select: { name: true } } } } } },
          payments: true,
        },
      }),
    ]);
    return {
      data: {
        suppliers,
        invoices: invoices.map((i) => ({
          ...i,
          paidCents: i.payments.reduce((s, p) => s + p.amountCents, 0),
        })),
      },
    };
  }

  async createSupplier(input: {
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
  }) {
    const data = await this.db.supplier.create({ data: input });
    return { data };
  }

  async createPurchase(
    actorId: string,
    input: {
      supplierId: string;
      invoiceNumber?: string;
      invoiceDate?: string;
      extraCostsCents: number;
      notes?: string;
      lines: Array<{ variantId: string; quantity: number; unitCostCents: number }>;
    }
  ) {
    const variantIds = input.lines.map((l) => l.variantId);
    if (new Set(variantIds).size !== variantIds.length)
      throw new AppError("PURCHASE_DUPLICATE_VARIANT", 400);
    const subtotalCents = input.lines.reduce((s, l) => s + l.quantity * l.unitCostCents, 0);
    const data = await this.db.purchaseInvoice.create({
      data: {
        supplierId: input.supplierId,
        invoiceNumber: input.invoiceNumber,
        invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : undefined,
        extraCostsCents: input.extraCostsCents,
        subtotalCents,
        totalCents: subtotalCents + input.extraCostsCents,
        notes: input.notes,
        createdById: actorId,
        lines: {
          create: input.lines.map((l) => ({ ...l, lineTotalCents: l.quantity * l.unitCostCents })),
        },
      },
      include: { lines: true, supplier: true },
    });
    return { data };
  }

  async confirmPurchase(actorId: string, id: string) {
    return this.db.$transaction(
      async (tx) => {
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id },
          include: { lines: true },
        });
        if (!invoice) throw new AppError("PURCHASE_NOT_FOUND", 404);
        if (invoice.status !== "DRAFT") throw new AppError("PURCHASE_ALREADY_CONFIRMED", 409);
        const lineBasis = invoice.lines.reduce((s, l) => s + l.lineTotalCents, 0);
        const totalBasis = lineBasis || invoice.lines.reduce((s, l) => s + l.quantity, 0);
        let allocated = 0;
        for (const [index, line] of invoice.lines.entries()) {
          const allocationBasis = lineBasis ? line.lineTotalCents : line.quantity;
          const allocation =
            index === invoice.lines.length - 1
              ? invoice.extraCostsCents - allocated
              : Math.floor((invoice.extraCostsCents * allocationBasis) / totalBasis);
          allocated += allocation;
          const unitCost = line.unitCostCents + Math.floor(allocation / line.quantity);
          const variant = await tx.productVariant.findUnique({ where: { id: line.variantId } });
          if (!variant) throw new AppError("VARIANT_NOT_FOUND", 404);
          const weighted =
            variant.costCents === null
              ? Math.floor((line.lineTotalCents + allocation) / line.quantity)
              : Math.floor(
                  (variant.costCents * variant.stockQuantity + line.lineTotalCents + allocation) /
                    (variant.stockQuantity + line.quantity)
                );
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stockQuantity: { increment: line.quantity }, costCents: weighted },
          });
          await tx.purchaseInvoiceLine.update({
            where: { id: line.id },
            data: { allocatedExtraCostCents: allocation },
          });
          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              type: "PURCHASE",
              quantityDelta: line.quantity,
              unitCostCents: unitCost,
              reference: `purchase:${invoice.id}:${line.id}`,
              reason: `Purchase invoice ${invoice.id}`,
              actorId,
            },
          });
        }
        const result = await tx.purchaseInvoice.update({
          where: { id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), confirmedById: actorId },
        });
        await tx.auditLog.create({
          data: { actorId, action: "PURCHASE_CONFIRMED", entity: "PurchaseInvoice", entityId: id },
        });
        return { data: result };
      },
      { isolationLevel: "Serializable" }
    );
  }

  async recordPurchasePayment(
    actorId: string,
    id: string,
    input: {
      amountCents: number;
      method: "CASH" | "BANK_TRANSFER" | "CHECK" | "OTHER";
      paidAt?: string;
      reference?: string;
    }
  ) {
    return this.db.$transaction(
      async (tx) => {
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id },
          include: { payments: true },
        });
        if (!invoice || invoice.status !== "CONFIRMED")
          throw new AppError("PURCHASE_NOT_PAYABLE", 400);
        const paid = invoice.payments.reduce((s, p) => s + p.amountCents, 0);
        if (input.amountCents > invoice.totalCents - paid)
          throw new AppError("PAYMENT_EXCEEDS_BALANCE", 400);
        const data = await tx.purchasePayment.create({
          data: {
            ...input,
            paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
            invoiceId: id,
            createdById: actorId,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "PURCHASE_PAYMENT_RECORDED",
            entity: "PurchaseInvoice",
            entityId: id,
            metadata: { amountCents: input.amountCents },
          },
        });
        return { data };
      },
      { isolationLevel: "Serializable" }
    );
  }

  async getShipping() {
    return { data: await this.db.shippingRate.findMany({ orderBy: { governorate: "asc" } }) };
  }
  async updateShipping(
    actorId: string,
    governorate: string,
    input: {
      priceCents: number;
      minDeliveryDays: number;
      maxDeliveryDays: number;
      isEnabled: boolean;
    }
  ) {
    const data = await this.db.$transaction(async (tx) => {
      const row = await tx.shippingRate.update({ where: { governorate }, data: input });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "SHIPPING_RATE_UPDATED",
          entity: "ShippingRate",
          entityId: governorate,
          metadata: input,
        },
      });
      return row;
    });
    return { data };
  }

  async getFinance(from: Date, to: Date) {
    const orders = await this.db.order.findMany({
      where: {
        OR: [
          { status: "DELIVERED", deliveredAt: { gte: from, lt: to } },
          { status: "RETURNED", returnedAt: { gte: from, lt: to } },
        ],
      },
      include: { items: true },
    });
    const expenses = await this.db.expense.findMany({
      where: {
        isVoided: false,
        occurredAt: { lt: to },
        OR: [
          {
            recurrence: "MONTHLY",
            OR: [{ recurrenceEndAt: null }, { recurrenceEndAt: { gte: from } }],
          },
          { recurrence: "ONE_TIME", occurredAt: { gte: from } },
        ],
      },
      orderBy: { occurredAt: "desc" },
    });
    const monthlyExpenseRows = expenses.flatMap((e) => {
      if (e.recurrence === "ONE_TIME")
        return [
          {
            id: e.id,
            description: e.description,
            category: e.category,
            amountCents: e.amountCents,
            occurredAt: e.occurredAt,
            platform: e.platform,
          },
        ];
      return monthlyOccurrences(e.occurredAt, from, to, e.recurrenceEndAt).map((occurredAt) => ({
        id: e.id,
        description: e.description,
        category: e.category,
        amountCents: e.amountCents,
        occurredAt,
        platform: e.platform,
      }));
    });
    const settlements = await this.db.courierSettlement.findMany({
      where: { settledAt: { gte: from, lt: to } },
    });
    return {
      data: {
        revenueCents:
          orders.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + o.totalCents, 0) -
          orders.filter((o) => o.status === "RETURNED").reduce((s, o) => s + o.totalCents, 0),
        cogsCents: orders.reduce(
          (s, o) =>
            s +
            (o.status === "RETURNED" ? -1 : 1) *
              o.items.reduce((a, i) => a + (i.unitCostCents ?? 0) * i.quantity, 0),
          0
        ),
        unknownCostLines: orders.flatMap((o) => o.items).filter((i) => i.unitCostCents === null)
          .length,
        expenses: monthlyExpenseRows,
        expensesCents:
          monthlyExpenseRows.reduce((s, e) => s + e.amountCents, 0) +
          settlements.reduce((s, x) => s + x.courierFeesCents, 0),
        settlements,
        awaitingSettlement: await this.db.order.findMany({
          where: { status: "DELIVERED", courierName: { not: null }, courierSettlement: null },
          select: {
            id: true,
            customerName: true,
            courierName: true,
            totalCents: true,
            deliveredAt: true,
          },
          orderBy: { deliveredAt: "asc" },
        }),
      },
    };
  }

  async addExpense(
    actorId: string,
    input: {
      category: "PACKAGING" | "ADS" | "SHIPPING_FEES" | "SALARIES" | "RENT" | "OTHER";
      platform?: string;
      description: string;
      amountCents: number;
      occurredAt?: string;
      recurrence: "ONE_TIME" | "MONTHLY";
      recurrenceEndAt?: string;
      receiptImageUrl?: string;
    }
  ) {
    const data = await this.db.$transaction(async (tx) => {
      const row = await tx.expense.create({
        data: {
          ...input,
          occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
          recurrenceEndAt: input.recurrenceEndAt ? new Date(input.recurrenceEndAt) : undefined,
          createdById: actorId,
        },
      });
      await tx.auditLog.create({
        data: { actorId, action: "EXPENSE_CREATED", entity: "Expense", entityId: row.id },
      });
      return row;
    });
    return { data };
  }

  async createSettlement(
    actorId: string,
    input: {
      courierName: string;
      orders: Array<{ orderId: string; courierFeeCents: number }>;
      settledAt?: string;
      reference?: string;
      notes?: string;
    }
  ) {
    if (new Set(input.orders.map((o) => o.orderId)).size !== input.orders.length)
      throw new AppError("SETTLEMENT_DUPLICATE_ORDER", 400);
    return this.db.$transaction(
      async (tx) => {
        const ids = input.orders.map((o) => o.orderId);
        const orders = await tx.order.findMany({
          where: { id: { in: ids } },
          include: { courierSettlement: true },
        });
        if (
          orders.length !== ids.length ||
          orders.some(
            (o) =>
              o.status !== "DELIVERED" || o.courierName !== input.courierName || o.courierSettlement
          )
        )
          throw new AppError("SETTLEMENT_ORDERS_INVALID", 400);
        const gross = orders.reduce((s, o) => s + o.totalCents, 0);
        const fees = input.orders.reduce((s, o) => s + o.courierFeeCents, 0);
        if (fees > gross) throw new AppError("SETTLEMENT_FEES_EXCEED_GROSS", 400);
        const row = await tx.courierSettlement.create({
          data: {
            courierName: input.courierName,
            settledAt: input.settledAt ? new Date(input.settledAt) : undefined,
            reference: input.reference,
            notes: input.notes,
            grossCollectedCents: gross,
            courierFeesCents: fees,
            netReceivedCents: gross - fees,
            createdById: actorId,
            orders: {
              create: input.orders.map((x) => ({
                orderId: x.orderId,
                orderAmountCents: orders.find((o) => o.id === x.orderId)!.totalCents,
                courierFeeCents: x.courierFeeCents,
              })),
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "COURIER_SETTLEMENT_CREATED",
            entity: "CourierSettlement",
            entityId: row.id,
            metadata: { gross, fees, net: gross - fees, orderCount: ids.length },
          },
        });
        return { data: row };
      },
      { isolationLevel: "Serializable" }
    );
  }

  async getSettings() {
    const [data, audit] = await Promise.all([
      this.db.storeSetting.findUnique({ where: { id: "global" } }),
      this.db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { actor: { select: { username: true, role: true } } },
      }),
    ]);
    return { data, audit };
  }
  async updateSettings(
    actorId: string,
    input: {
      storeName: string;
      supportPhone?: string | null;
      supportWhatsApp?: string | null;
      freeShippingThresholdCents: number;
      allowCouponsWithOffers: boolean;
      dailyOrderLimitPerPhone?: number | null;
    }
  ) {
    return this.db.$transaction(async (tx) => {
      const data = await tx.storeSetting.update({
        where: { id: "global" },
        data: { ...input, updatedById: actorId },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "STORE_SETTINGS_UPDATED",
          entity: "StoreSetting",
          entityId: "global",
          metadata: input,
        },
      });
      return { data };
    });
  }

  async listStaff() {
    return {
      data: await this.db.adminAccount.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    };
  }
  async createStaff(
    actorId: string,
    input: { username: string; password: string; role: Exclude<AdminRole, "OWNER"> }
  ) {
    if (!this.encryptionKey) throw new AppError("SERVICE_UNAVAILABLE", 503);
    if (input.password.length < 15 || /^(password|qwerty|123456|letmein)/i.test(input.password))
      throw new AppError("ADMIN_PASSWORD_POLICY", 400);
    const secret = generateTotpSecret(),
      recovery = generateRecoveryCodes();
    const data = await this.db.$transaction(async (tx) => {
      const staff = await tx.adminAccount.create({
        data: {
          username: input.username,
          passwordHash: await argon2.hash(input.password, {
            type: argon2.argon2id,
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
          }),
          role: input.role,
          mfaSecretEncrypted: encryptTotpSecret(secret, this.encryptionKey),
          recoveryCodes: { create: recovery.map((code) => ({ codeHash: hashRecoveryCode(code) })) },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "STAFF_CREATED",
          entity: "AdminAccount",
          entityId: staff.id,
          metadata: { username: staff.username, role: staff.role },
        },
      });
      return { id: staff.id, username: staff.username, role: staff.role, isActive: staff.isActive };
    });
    return {
      data,
      provisioning: { otpauthUrl: createTotpUri(secret, input.username), recoveryCodes: recovery },
    };
  }
  async updateStaff(
    actorId: string,
    id: string,
    input: { role?: Exclude<AdminRole, "OWNER">; isActive?: boolean }
  ) {
    if (actorId === id && input.isActive === false) throw new AppError("CANNOT_DISABLE_SELF", 400);
    return this.db.$transaction(async (tx) => {
      const current = await tx.adminAccount.findUnique({ where: { id } });
      if (!current) throw new AppError("STAFF_NOT_FOUND", 404);
      if (current.role === "OWNER") throw new AppError("OWNER_IMMUTABLE", 400);
      const data = await tx.adminAccount.update({ where: { id }, data: input });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "STAFF_UPDATED",
          entity: "AdminAccount",
          entityId: id,
          metadata: input,
        },
      });
      return {
        data: { id: data.id, username: data.username, role: data.role, isActive: data.isActive },
      };
    });
  }
  async resetStaffMfa(actorId: string, id: string) {
    if (!this.encryptionKey) throw new AppError("SERVICE_UNAVAILABLE", 503);
    const secret = generateTotpSecret(),
      recovery = generateRecoveryCodes();
    const data = await this.db.$transaction(async (tx) => {
      const staff = await tx.adminAccount.findUnique({ where: { id } });
      if (!staff) throw new AppError("STAFF_NOT_FOUND", 404);
      if (staff.role === "OWNER") throw new AppError("OWNER_MFA_RESET_DENIED", 400);
      await tx.adminRecoveryCode.deleteMany({ where: { adminId: id } });
      await tx.adminAccount.update({
        where: { id },
        data: {
          mfaSecretEncrypted: encryptTotpSecret(secret, this.encryptionKey),
          lastTotpCounter: null,
          recoveryCodes: { create: recovery.map((code) => ({ codeHash: hashRecoveryCode(code) })) },
        },
      });
      await tx.auditLog.create({
        data: { actorId, action: "STAFF_MFA_RESET", entity: "AdminAccount", entityId: id },
      });
      return { id, username: staff.username };
    });
    return {
      data,
      provisioning: { otpauthUrl: createTotpUri(secret, data.username), recoveryCodes: recovery },
    };
  }
}

function monthlyOccurrences(
  start: Date,
  rangeStart: Date,
  rangeEnd: Date,
  end: Date | null
): Date[] {
  const cursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1));
  const occurrences: Date[] = [];
  while (cursor < rangeEnd) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const day = Math.min(start.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
    const occurrence = new Date(
      Date.UTC(
        year,
        month,
        day,
        start.getUTCHours(),
        start.getUTCMinutes(),
        start.getUTCSeconds(),
        start.getUTCMilliseconds()
      )
    );
    if (
      occurrence >= start &&
      occurrence >= rangeStart &&
      occurrence < rangeEnd &&
      (!end || occurrence <= end)
    )
      occurrences.push(occurrence);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return occurrences;
}
