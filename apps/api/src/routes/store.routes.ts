import type { FastifyInstance } from "fastify";
import { createOrderSchema, idempotencyKeySchema, productListQuerySchema } from "@store/shared";
import { AppError } from "../errors.js";
import { CatalogService } from "../services/catalog.service.js";
import { OrderService } from "../services/order.service.js";

export function registerStoreRoutes(app: FastifyInstance, services: { catalog: CatalogService; orders: OrderService }): void {
  app.get("/products", async (request) => {
    const query = productListQuerySchema.parse(request.query);
    return services.catalog.list(query);
  });

  app.get("/products/:slug", async (request) => {
    const params = request.params as { slug?: unknown };
    if (typeof params.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.slug)) {
      throw new AppError("VALIDATION_ERROR", 400);
    }
    return services.catalog.getBySlug(params.slug);
  });

  app.post("/orders", async (request, reply) => {
    const idempotencyKey = idempotencyKeySchema.parse(request.headers["idempotency-key"]);
    const input = createOrderSchema.parse(request.body);
    const result = await services.orders.create(input, idempotencyKey);
    return reply.status(result.idempotentReplay ? 200 : 201).send(result);
  });
}
