import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  adminCreateBundleSchema,
  adminCreateProductOfferSchema,
  adminUpdateBundleSchema,
  adminUpdateProductOfferSchema,
  hasAdminPermission,
  idParamSchema,
} from "@store/shared";
import { AppError } from "../errors.js";
import type { AdminService } from "../services/admin.service.js";
import type { BundleService } from "../services/bundle.service.js";
import type { ProductOfferService } from "../services/product-offer.service.js";
import { adminSessionCookieName, requireAdminOrigin, requireCsrf } from "./admin-auth.routes.js";

export function registerStoreOfferRoutes(
  app: FastifyInstance,
  offers: ProductOfferService,
  bundles: BundleService,
): void {
  // Public active offers
  app.get("/offers", async (_request, reply) => {
    const result = await offers.listActivePublic();
    return reply.send(result);
  });

  // Public active bundles
  app.get("/bundles", async (_request, reply) => {
    const result = await bundles.listActivePublic();
    return reply.send(result);
  });

  // Public bundle detail
  app.get("/bundles/:id", async (request, reply) => {
    const params = idParamSchema.parse(request.params);
    const result = await bundles.getById(params.id);
    return reply.send(result);
  });
}

export function registerAdminOfferRoutes(
  app: FastifyInstance,
  offers: ProductOfferService,
  bundles: BundleService,
  admins: AdminService,
  allowedOrigins: string[],
): void {
  // ================= Offers Admin =================
  app.get("/offers", async (request, reply) => {
    await requireOfferAdmin(request, admins);
    const result = await offers.listForAdmin();
    return reply.header("Cache-Control", "no-store").send(result);
  });

  app.post("/offers", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireOfferAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const input = adminCreateProductOfferSchema.parse(request.body);
    const result = await offers.create(input);
    return reply.status(201).send(result);
  });

  app.patch("/offers/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireOfferAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const params = idParamSchema.parse(request.params);
    const input = adminUpdateProductOfferSchema.parse(request.body);
    const result = await offers.update(params.id, input);
    return reply.send(result);
  });

  app.delete("/offers/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireOfferAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const params = idParamSchema.parse(request.params);
    const result = await offers.delete(params.id);
    return reply.send(result);
  });

  // ================= Bundles Admin =================
  app.get("/bundles", async (request, reply) => {
    await requireOfferAdmin(request, admins);
    const result = await bundles.listForAdmin();
    return reply.header("Cache-Control", "no-store").send(result);
  });

  app.post("/bundles", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireOfferAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const input = adminCreateBundleSchema.parse(request.body);
    const result = await bundles.create(input);
    return reply.status(201).send(result);
  });

  app.patch("/bundles/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireOfferAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const params = idParamSchema.parse(request.params);
    const input = adminUpdateBundleSchema.parse(request.body);
    const result = await bundles.update(params.id, input);
    return reply.send(result);
  });

  app.delete("/bundles/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireOfferAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const params = idParamSchema.parse(request.params);
    const result = await bundles.delete(params.id);
    return reply.send(result);
  });
}

async function requireOfferAdmin(request: FastifyRequest, admins: AdminService) {
  const session = await admins.getSession(request.cookies[adminSessionCookieName]);
  if (!hasAdminPermission(session.data.role, "manageOffers")) {
    throw new AppError("ADMIN_FORBIDDEN", 403);
  }
  return session;
}
