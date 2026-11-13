import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  adminCreateCouponSchema,
  adminUpdateCouponSchema,
  hasAdminPermission,
  idParamSchema,
  validateCouponSchema,
} from "@store/shared";
import { AppError } from "../errors.js";
import type { AdminService } from "../services/admin.service.js";
import type { CouponService } from "../services/coupon.service.js";
import { adminSessionCookieName, requireAdminOrigin, requireCsrf } from "./admin-auth.routes.js";

export function registerCouponRoutes(app: FastifyInstance, coupons: CouponService): void {
  app.post("/validate", async (request, reply) => {
    const input = validateCouponSchema.parse(request.body);
    const result = await coupons.validate(input);
    return reply.send(result);
  });
}

export function registerAdminCouponRoutes(
  app: FastifyInstance,
  coupons: CouponService,
  admins: AdminService,
  allowedOrigins: string[],
): void {
  app.get("/", async (request, reply) => {
    await requireCouponAdmin(request, admins);
    const result = await coupons.listAllForAdmin();
    return reply.header("Cache-Control", "no-store").send(result);
  });

  app.post("/", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireCouponAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const input = adminCreateCouponSchema.parse(request.body);
    const result = await coupons.createByAdmin(input);
    return reply.status(201).send(result);
  });

  app.patch("/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireCouponAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const params = idParamSchema.parse(request.params);
    const input = adminUpdateCouponSchema.parse(request.body);
    const result = await coupons.updateByAdmin(params.id, input);
    return reply.send(result);
  });

  app.delete("/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireCouponAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const params = idParamSchema.parse(request.params);
    const result = await coupons.deleteByAdmin(params.id);
    return reply.send(result);
  });
}

async function requireCouponAdmin(request: FastifyRequest, admins: AdminService) {
  const session = await admins.getSession(request.cookies[adminSessionCookieName]);
  if (!hasAdminPermission(session.data.role, "manageCoupons")) {
    throw new AppError("ADMIN_FORBIDDEN", 403);
  }
  return session;
}
