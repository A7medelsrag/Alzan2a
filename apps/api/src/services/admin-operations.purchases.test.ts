import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AdminOperationsService } from "./admin-operations.service.js";

describe("AdminOperationsService purchasing lifecycle", () => {
  it("creates a draft invoice without touching product stock, average cost, or stock movements", async () => {
    const productVariantUpdate = vi.fn();
    const stockMovementCreate = vi.fn();
    const purchaseInvoiceCreate = vi.fn().mockResolvedValue({
      id: "inv-1",
      status: "DRAFT",
      subtotalCents: 25_000,
      extraCostsCents: 2_000,
      totalCents: 27_000,
      lines: [
        { id: "l1", variantId: "v1", quantity: 2, unitCostCents: 10_000, lineTotalCents: 20_000 },
        { id: "l2", variantId: "v2", quantity: 1, unitCostCents: 5_000, lineTotalCents: 5_000 },
      ],
      supplier: { id: "sup-1", name: "مورد النيل" },
    });

    const db = {
      purchaseInvoice: { create: purchaseInvoiceCreate },
      productVariant: { update: productVariantUpdate },
      stockMovement: { create: stockMovementCreate },
    } as unknown as PrismaClient;

    const service = new AdminOperationsService(db);
    const res = await service.createPurchase("admin-1", {
      supplierId: "sup-1",
      invoiceNumber: "INV-101",
      extraCostsCents: 2_000,
      lines: [
        { variantId: "v1", quantity: 2, unitCostCents: 10_000 },
        { variantId: "v2", quantity: 1, unitCostCents: 5_000 },
      ],
    });

    expect(res.data.status).toBe("DRAFT");
    expect(purchaseInvoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotalCents: 25_000,
          extraCostsCents: 2_000,
          totalCents: 27_000,
        }),
      }),
    );
    expect(productVariantUpdate).not.toHaveBeenCalled();
    expect(stockMovementCreate).not.toHaveBeenCalled();
  });

  it("approves a draft once, updates stock and weighted average cost, and blocks duplicate approval", async () => {
    let status: "DRAFT" | "CONFIRMED" = "DRAFT";
    const variantUpdate = vi.fn();
    const lineUpdate = vi.fn();
    const stockMovementCreate = vi.fn();
    const auditCreate = vi.fn();

    const tx = {
      purchaseInvoice: {
        findUnique: vi.fn().mockImplementation(async () => ({
          id: "inv-2",
          status,
          extraCostsCents: 1_000,
          lines: [
            {
              id: "line-1",
              variantId: "v1",
              quantity: 10,
              unitCostCents: 1_200,
              lineTotalCents: 12_000,
            },
          ],
        })),
        update: vi.fn().mockImplementation(async ({ data }) => {
          status = data.status;
          return { id: "inv-2", status };
        }),
      },
      productVariant: {
        // Existing stock 10 units at weighted cost 1000 cents + 10 units @ (12000 + 1000) = 23000 / 20 = 1150 cents
        findUnique: vi.fn().mockResolvedValue({ id: "v1", stockQuantity: 10, costCents: 1_000 }),
        update: variantUpdate,
      },
      purchaseInvoiceLine: { update: lineUpdate },
      stockMovement: { create: stockMovementCreate },
      auditLog: { create: auditCreate },
    };

    const db = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(tx)),
    } as unknown as PrismaClient;

    const service = new AdminOperationsService(db);
    const confirmed = await service.confirmPurchase("admin-1", "inv-2");

    expect(confirmed.data.status).toBe("CONFIRMED");
    expect(variantUpdate).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: { stockQuantity: { increment: 10 }, costCents: 1_150 },
    });
    expect(lineUpdate).toHaveBeenCalledWith({
      where: { id: "line-1" },
      data: { allocatedExtraCostCents: 1_000 },
    });
    expect(stockMovementCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith({
      data: { actorId: "admin-1", action: "PURCHASE_CONFIRMED", entity: "PurchaseInvoice", entityId: "inv-2" },
    });

    await expect(service.confirmPurchase("admin-1", "inv-2")).rejects.toMatchObject({
      code: "PURCHASE_ALREADY_CONFIRMED",
      statusCode: 409,
    });
    expect(variantUpdate).toHaveBeenCalledTimes(1);
    expect(stockMovementCreate).toHaveBeenCalledTimes(1);
  });

  it("enforces confirmed invoice requirement and remaining balance check for partial payments", async () => {
    const paymentCreate = vi.fn().mockResolvedValue({
      id: "pay-1",
      amountCents: 4_000,
      method: "CASH",
    });
    const auditCreate = vi.fn();

    let currentStatus: "DRAFT" | "CONFIRMED" = "DRAFT";
    const existingPayments: Array<{ amountCents: number }> = [];

    const tx = {
      purchaseInvoice: {
        findUnique: vi.fn().mockImplementation(async () => ({
          id: "inv-3",
          status: currentStatus,
          totalCents: 10_000,
          payments: existingPayments,
        })),
      },
      purchasePayment: { create: paymentCreate },
      auditLog: { create: auditCreate },
    };

    const db = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(tx)),
    } as unknown as PrismaClient;

    const service = new AdminOperationsService(db);

    await expect(
      service.recordPurchasePayment("admin-1", "inv-3", { amountCents: 4_000, method: "CASH" }),
    ).rejects.toMatchObject({ code: "PURCHASE_NOT_PAYABLE", statusCode: 400 });

    currentStatus = "CONFIRMED";
    await service.recordPurchasePayment("admin-1", "inv-3", { amountCents: 4_000, method: "CASH" });
    existingPayments.push({ amountCents: 4_000 });
    expect(paymentCreate).toHaveBeenCalledTimes(1);

    await expect(
      service.recordPurchasePayment("admin-1", "inv-3", { amountCents: 7_000, method: "CASH" }),
    ).rejects.toMatchObject({ code: "PAYMENT_EXCEEDS_BALANCE", statusCode: 400 });
  });
});
