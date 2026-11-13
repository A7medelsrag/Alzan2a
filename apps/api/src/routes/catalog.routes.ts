import type { FastifyInstance } from "fastify";
import { productListQuerySchema } from "@store/shared";
import { AppError } from "../errors.js";
import { CatalogService } from "../services/catalog.service.js";

export function registerCatalogRoutes(app: FastifyInstance, catalog: CatalogService): void {
  app.get("/categories", async () => {
    return catalog.listCategories();
  });

  app.get("/products", async (request) => {
    const query = productListQuerySchema.parse(request.query);
    return catalog.list(query);
  });

  app.get("/products/:slug", async (request) => {
    const params = request.params as { slug?: unknown };
    if (typeof params.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.slug)) {
      throw new AppError("VALIDATION_ERROR", 400);
    }
    return catalog.getBySlug(params.slug);
  });
}
