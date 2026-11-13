import type { FastifyInstance, FastifyRequest } from "fastify";
import { z, hasAdminPermission } from "@store/shared";
import { AppError } from "../errors.js";
import type { AdminService } from "../services/admin.service.js";
import type { AdminManagementService } from "../services/admin-management.service.js";
import { adminSessionCookieName, requireAdminOrigin, requireCsrf } from "./admin-auth.routes.js";

async function requireCatalogAdmin(request: FastifyRequest, admins: AdminService) {
  const session = await admins.getSession(request.cookies[adminSessionCookieName]);
  if (!hasAdminPermission(session.data.role, "manageCatalog")) {
    throw new AppError("ADMIN_FORBIDDEN", 403);
  }
  return session;
}

async function requireCatalogViewer(request: FastifyRequest, admins: AdminService) {
  const session = await admins.getSession(request.cookies[adminSessionCookieName]);
  if (!hasAdminPermission(session.data.role, "viewCatalog")) throw new AppError("ADMIN_FORBIDDEN", 403);
  return session;
}

export function registerAdminManagementRoutes(
  app: FastifyInstance,
  management: AdminManagementService,
  admins: AdminService,
  allowedOrigins: string[],
): void {
  // Overview KPIs
  app.get("/overview", async (request, reply) => {
    const session = await admins.getSession(request.cookies[adminSessionCookieName]);
    const result = await management.getOverviewStats();
    const stats = result.data as Omit<typeof result.data, "totalSalesCents" | "todaySalesCents"> & {
      totalSalesCents: number | null;
      todaySalesCents: number | null;
    };
    if (!hasAdminPermission(session.data.role, "viewFinance")) {
      stats.totalSalesCents = null;
      stats.todaySalesCents = null;
    }
    return reply.header("Cache-Control", "no-store").send(result);
  });

  // Products
  app.get("/products", async (request, reply) => {
    await requireCatalogViewer(request, admins);
    const query = request.query as { search?: string; categoryId?: string; status?: string };
    const result = await management.listProducts(query);
    return reply.header("Cache-Control", "no-store").send(result);
  });

  app.post("/products", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireCatalogAdmin(request, admins);
    requireCsrf(request, session.csrfToken);

    const schema = z.object({
      name: z.string().min(2),
      slug: z.string().optional(),
      description: z.string().min(2),
      categoryId: z.string().uuid(),
      imageUrl: z.string().nullable().optional(),
      status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
      variants: z
        .array(
          z.object({
            name: z.string().min(1),
            priceCents: z.number().int().positive(),
            stockQuantity: z.number().int().nonnegative(),
            sku: z.string().optional(),
          }),
        )
        .optional(),
    });

    const input = schema.parse(request.body);
    const result = await management.createProduct(input);
    return reply.status(201).send(result);
  });

  app.patch("/products/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireCatalogAdmin(request, admins);
    requireCsrf(request, session.csrfToken);

    const params = request.params as { id: string };
    const schema = z.object({
      name: z.string().min(2).optional(),
      description: z.string().min(2).optional(),
      categoryId: z.string().uuid().optional(),
      imageUrl: z.string().nullable().optional(),
      status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
    });

    const input = schema.parse(request.body);
    const result = await management.updateProduct(params.id, input);
    return reply.send(result);
  });

  // Quick Variant Stock Update
  app.patch("/variants/:id/stock", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireCatalogAdmin(request, admins);
    requireCsrf(request, session.csrfToken);

    const params = request.params as { id: string };
    const schema = z.object({ stockQuantity: z.number().int().nonnegative(), reason: z.string().trim().min(5).max(500) });
    const input = schema.parse(request.body);
    const result = await management.updateVariantStock(params.id, input.stockQuantity, input.reason, session.data.id);
    return reply.send(result);
  });

  // Categories
  app.get("/categories", async (request, reply) => {
    await requireCatalogViewer(request, admins);
    const result = await management.listCategories();
    return reply.header("Cache-Control", "no-store").send(result);
  });

  app.post("/categories", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireCatalogAdmin(request, admins);
    requireCsrf(request, session.csrfToken);

    const schema = z.object({
      name: z.string().min(2),
      slug: z.string().optional(),
      parentId: z.string().uuid().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
    });

    const input = schema.parse(request.body);
    const result = await management.createCategory(input);
    return reply.status(201).send(result);
  });

  app.patch("/categories/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireCatalogAdmin(request, admins);
    requireCsrf(request, session.csrfToken);

    const params = request.params as { id: string };
    const schema = z.object({
      name: z.string().min(2).optional(),
      slug: z.string().optional(),
      parentId: z.string().uuid().nullable().optional(),
      imageUrl: z.string().nullable().optional(),
    });

    const input = schema.parse(request.body);
    const result = await management.updateCategory(params.id, input);
    return reply.send(result);
  });

  app.delete("/categories/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireCatalogAdmin(request, admins);
    requireCsrf(request, session.csrfToken);

    const params = request.params as { id: string };
    const result = await management.deleteCategory(params.id);
    return reply.send(result);
  });

  // Customers
  app.get("/customers", async (request, reply) => {
    const session = await admins.getSession(request.cookies[adminSessionCookieName]);
    if (!hasAdminPermission(session.data.role, "manageCustomers")) {
      throw new AppError("ADMIN_FORBIDDEN", 403);
    }
    const result = await management.listCustomers();
    return reply.header("Cache-Control", "no-store").send(result);
  });

  // Reviews Moderation
  app.get("/reviews", async (request, reply) => {
    const session = await admins.getSession(request.cookies[adminSessionCookieName]);
    if (!hasAdminPermission(session.data.role, "manageReviews")) {
      throw new AppError("ADMIN_FORBIDDEN", 403);
    }
    const query = request.query as { status?: string };
    const result = await management.listReviews(query.status);
    return reply.header("Cache-Control", "no-store").send(result);
  });

  app.patch("/reviews/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await admins.getSession(request.cookies[adminSessionCookieName]);
    requireCsrf(request, session.csrfToken);
    if (!hasAdminPermission(session.data.role, "manageReviews")) {
      throw new AppError("ADMIN_FORBIDDEN", 403);
    }

    const params = request.params as { id: string };
    const schema = z.object({ status: z.enum(["APPROVED", "REJECTED", "PENDING"]) });
    const input = schema.parse(request.body);
    const result = await management.updateReviewStatus(params.id, input.status);
    return reply.send(result);
  });
}
