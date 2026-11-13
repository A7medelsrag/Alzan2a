import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  categoryImageUpdateSchema,
  homepageBannerInputSchema,
  homepageReorderSchema,
  homepageSectionInputSchema,
  hasAdminPermission,
  productImageUpdateSchema,
} from "@store/shared";
import { AppError } from "../errors.js";
import { adminSessionCookieName, requireAdminOrigin, requireCsrf } from "./admin-auth.routes.js";
import { AdminService } from "../services/admin.service.js";
import { HomepageService } from "../services/homepage.service.js";

function readRecordId(request: FastifyRequest): string {
  const params = request.params as { id?: unknown };
  if (typeof params.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.id)) {
    throw new AppError("VALIDATION_ERROR", 400);
  }
  return params.id;
}

async function requireContentAdmin(request: FastifyRequest, admins: AdminService) {
  const session = await admins.getSession(request.cookies[adminSessionCookieName]);
  if (!hasAdminPermission(session.data.role, "manageHomepage")) {
    throw new AppError("ADMIN_FORBIDDEN", 403);
  }
  return session;
}

export function registerHomepageRoutes(app: FastifyInstance, homepage: HomepageService): void {
  app.get("/", async () => ({ data: await homepage.listPublished() }));
}

export function registerAdminHomepageRoutes(
  app: FastifyInstance,
  homepage: HomepageService,
  admins: AdminService,
  allowedOrigins: string[],
): void {
  app.get("/", async (request, reply) => {
    await requireContentAdmin(request, admins);
    return reply.header("Cache-Control", "no-store").send({ data: await homepage.listForAdmin() });
  });

  app.post("/sections", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireContentAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const input = homepageSectionInputSchema.parse(request.body);
    return reply.status(201).send({ data: await homepage.saveSection(input, session.data.id) });
  });

  app.put("/sections/order", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireContentAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const input = homepageReorderSchema.parse(request.body);
    await homepage.reorderSections(input.ids, session.data.id);
    return reply.status(204).send();
  });

  app.put("/sections/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireContentAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const input = homepageSectionInputSchema.parse(request.body);
    const data = await homepage.saveSection(input, session.data.id, readRecordId(request));
    return reply.send({ data });
  });

  app.delete("/sections/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireContentAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    await homepage.deleteSection(readRecordId(request), session.data.id);
    return reply.status(204).send();
  });

  app.post("/banners", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireContentAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const input = homepageBannerInputSchema.parse(request.body);
    return reply.status(201).send({ data: await homepage.saveBanner(input, session.data.id) });
  });

  app.put("/banners/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireContentAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const input = homepageBannerInputSchema.parse(request.body);
    const data = await homepage.saveBanner(input, session.data.id, readRecordId(request));
    return reply.send({ data });
  });

  app.delete("/banners/:id", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireContentAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    await homepage.deleteBanner(readRecordId(request), session.data.id);
    return reply.status(204).send();
  });

  app.put("/products/:id/image", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireContentAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const input = productImageUpdateSchema.parse(request.body);
    await homepage.updateProductImage(readRecordId(request), input.imageUrl, session.data.id);
    return reply.status(204).send();
  });

  app.put("/categories/:id/images", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await requireContentAdmin(request, admins);
    requireCsrf(request, session.csrfToken);
    const input = categoryImageUpdateSchema.parse(request.body);
    await homepage.updateCategoryImages(readRecordId(request), input.imageUrl, input.bannerImageUrl, session.data.id);
    return reply.status(204).send();
  });
}
