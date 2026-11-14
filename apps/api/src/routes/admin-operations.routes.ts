import type { FastifyInstance, FastifyRequest } from "fastify";
import { hasAdminPermission, z } from "@store/shared";
import type { AdminService } from "../services/admin.service.js";
import type { AdminOperationsService } from "../services/admin-operations.service.js";
import { AppError } from "../errors.js";
import { adminSessionCookieName, requireAdminOrigin, requireCsrf } from "./admin-auth.routes.js";

async function authorize(
  request: FastifyRequest,
  admins: AdminService,
  permission: Parameters<typeof hasAdminPermission>[1]
) {
  const session = await admins.getSession(request.cookies[adminSessionCookieName]);
  if (!hasAdminPermission(session.data.role as never, permission))
    throw new AppError("ADMIN_FORBIDDEN", 403);
  return session;
}
function body<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  return schema.parse(value);
}

export function registerAdminOperationsRoutes(
  app: FastifyInstance,
  ops: AdminOperationsService,
  admins: AdminService,
  origins: string[]
) {
  const mutate = async (
    request: FastifyRequest,
    permission: Parameters<typeof hasAdminPermission>[1]
  ) => {
    requireAdminOrigin(request, origins);
    const session = await authorize(request, admins, permission);
    requireCsrf(request, session.csrfToken);
    return session;
  };

  app.get("/purchases", async (r) => {
    await authorize(r, admins, "viewPurchases");
    return ops.getPurchases();
  });
  app.post("/purchases/suppliers", async (r, reply) => {
    await mutate(r, "managePurchases");
    const input = body(
      z
        .object({
          name: z.string().trim().min(2).max(150),
          contactName: z.string().max(150).optional(),
          phone: z.string().max(40).optional(),
          email: z.string().email().optional(),
          address: z.string().max(500).optional(),
        })
        .strict(),
      r.body
    );
    return reply.code(201).send(await ops.createSupplier(input));
  });
  app.post("/purchases", async (r, reply) => {
    const s = await mutate(r, "managePurchases");
    const input = body(
      z
        .object({
          supplierId: z.string().uuid(),
          invoiceNumber: z.string().max(100).optional(),
          invoiceDate: z.string().datetime().optional(),
          extraCostsCents: z.number().int().nonnegative(),
          notes: z.string().max(2000).optional(),
          lines: z
            .array(
              z
                .object({
                  variantId: z.string().uuid(),
                  quantity: z.number().int().positive(),
                  unitCostCents: z.number().int().nonnegative(),
                })
                .strict()
            )
            .min(1)
            .max(100),
        })
        .strict(),
      r.body
    );
    return reply.code(201).send(await ops.createPurchase(s.data.id, input));
  });
  app.post("/purchases/:id/confirm", async (r) => {
    const s = await mutate(r, "managePurchases");
    const { id } = body(z.object({ id: z.string().uuid() }), r.params);
    return ops.confirmPurchase(s.data.id, id);
  });
  app.post("/purchases/:id/payments", async (r, reply) => {
    const s = await mutate(r, "managePurchases");
    const { id } = body(z.object({ id: z.string().uuid() }), r.params);
    const input = body(
      z
        .object({
          amountCents: z.number().int().positive(),
          method: z.enum(["CASH", "BANK_TRANSFER", "CHECK", "OTHER"]),
          paidAt: z.string().datetime().optional(),
          reference: z.string().max(150).optional(),
        })
        .strict(),
      r.body
    );
    return reply.code(201).send(await ops.recordPurchasePayment(s.data.id, id, input));
  });

  app.get("/shipping", async (r) => {
    await authorize(r, admins, "viewShipping");
    return ops.getShipping();
  });
  app.patch("/shipping/:governorate", async (r) => {
    const s = await mutate(r, "manageShipping");
    const { governorate } = body(z.object({ governorate: z.string().min(2).max(100) }), r.params);
    const input = body(
      z
        .object({
          priceCents: z.number().int().nonnegative(),
          minDeliveryDays: z.number().int().positive(),
          maxDeliveryDays: z.number().int().positive(),
          isEnabled: z.boolean(),
        })
        .strict(),
      r.body
    );
    if (input.maxDeliveryDays < input.minDeliveryDays)
      throw new AppError("SHIPPING_DAYS_INVALID", 400);
    return ops.updateShipping(s.data.id, governorate, input);
  });

  app.get("/finance", async (r) => {
    await authorize(r, admins, "viewFinance");
    const q = body(
      z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional() }),
      r.query
    );
    const to = q.to ? new Date(q.to) : new Date();
    const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30 * 86400000);
    if (from >= to) throw new AppError("DATE_RANGE_INVALID", 400);
    return ops.getFinance(from, to);
  });
  app.post("/finance/expenses", async (r, reply) => {
    const s = await mutate(r, "manageFinance");
    const input = body(
      z
        .object({
          category: z.enum(["PACKAGING", "ADS", "SHIPPING_FEES", "SALARIES", "RENT", "OTHER"]),
          platform: z.string().trim().min(1).max(100).optional(),
          description: z.string().trim().min(2).max(500),
          amountCents: z.number().int().positive(),
          occurredAt: z.string().datetime().optional(),
          recurrence: z.enum(["ONE_TIME", "MONTHLY"]),
          recurrenceEndAt: z.string().datetime().optional(),
          receiptImageUrl: z.string().url().optional(),
        })
        .strict(),
      r.body
    );
    if (input.category === "ADS" && !input.platform)
      throw new AppError("AD_PLATFORM_REQUIRED", 400);
    return reply.code(201).send(await ops.addExpense(s.data.id, input));
  });
  app.post("/finance/settlements", async (r, reply) => {
    const s = await mutate(r, "manageFinance");
    const input = body(
      z
        .object({
          courierName: z.string().trim().min(1).max(150),
          orders: z
            .array(
              z
                .object({
                  orderId: z.string().uuid(),
                  courierFeeCents: z.number().int().nonnegative(),
                })
                .strict()
            )
            .min(1)
            .max(200),
          settledAt: z.string().datetime().optional(),
          reference: z.string().max(150).optional(),
          notes: z.string().max(1000).optional(),
        })
        .strict(),
      r.body
    );
    return reply.code(201).send(await ops.createSettlement(s.data.id, input));
  });

  app.get("/settings", async (r) => {
    await authorize(r, admins, "viewSettings");
    return ops.getSettings();
  });
  app.patch("/settings", async (r) => {
    const s = await mutate(r, "manageSettings");
    const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح (يجب أن يكون بصيغة #RRGGBB)");
    const input = body(
      z
        .object({
          storeName: z.string().trim().min(2).max(100),
          dashboardName: z.string().trim().min(2).max(100).optional(),
          buttonColor: hexColor.optional(),
          backgroundColor: hexColor.optional(),
          supportPhone: z.string().max(40).nullable().optional(),
          supportWhatsApp: z.string().max(40).nullable().optional(),
          freeShippingThresholdCents: z.number().int().nonnegative(),
          allowCouponsWithOffers: z.boolean(),
          dailyOrderLimitPerPhone: z.number().int().positive().nullable().optional(),
        })
        .strict(),
      r.body
    );
    return ops.updateSettings(s.data.id, input);
  });
  app.get("/staff", async (r) => {
    await authorize(r, admins, "manageStaff");
    return ops.listStaff();
  });
  app.post("/staff", async (r, reply) => {
    const s = await mutate(r, "manageStaff");
    const input = body(
      z
        .object({
          username: z
            .string()
            .trim()
            .min(3)
            .max(100)
            .regex(/^[a-zA-Z0-9._-]+$/),
          password: z.string().min(15).max(128),
          role: z.enum(["MANAGER", "INVENTORY", "ACCOUNTANT", "SUPPORT"]),
        })
        .strict(),
      r.body
    );
    return reply.code(201).send(await ops.createStaff(s.data.id, input));
  });
  app.patch("/staff/:id", async (r) => {
    const s = await mutate(r, "manageStaff");
    const { id } = body(z.object({ id: z.string().uuid() }), r.params);
    const input = body(
      z
        .object({
          role: z.enum(["MANAGER", "INVENTORY", "ACCOUNTANT", "SUPPORT"]).optional(),
          isActive: z.boolean().optional(),
        })
        .strict()
        .refine((o) => Object.keys(o).length > 0),
      r.body
    );
    const result = await ops.updateStaff(s.data.id, id, input);
    if (id !== s.data.id) await admins.revokeAllSessions(id);
    return result;
  });
  app.post("/staff/:id/reset-mfa", async (r) => {
    const s = await mutate(r, "manageStaff");
    const { id } = body(z.object({ id: z.string().uuid() }), r.params);
    const result = await ops.resetStaffMfa(s.data.id, id);
    await admins.revokeAllSessions(id);
    return result;
  });
}
