import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  createReviewSchema,
  productIdParamSchema,
} from "@store/shared";
import { AppError } from "../errors.js";
import type { CustomerService } from "../services/customer.service.js";
import { customerSessionCookieName } from "./customer.routes.js";
import { tokensMatch } from "../services/customer-session.store.js";
import type { ReviewService } from "../services/review.service.js";

export function registerReviewRoutes(
  app: FastifyInstance,
  reviews: ReviewService,
  customers: CustomerService,
): void {
  app.get("/:productId", async (request, reply) => {
    const params = productIdParamSchema.parse(request.params);
    const result = await reviews.getProductReviews(params.productId);
    return reply.send(result);
  });

  app.post("/:productId", async (request, reply) => {
    const sessionToken = request.cookies[customerSessionCookieName];
    if (!sessionToken) {
      throw new AppError("CUSTOMER_UNAUTHENTICATED", 401);
    }
    const session = await customers.getSession(sessionToken);
    requireCsrf(request, session.csrfToken);

    const params = productIdParamSchema.parse(request.params);
    const input = createReviewSchema.parse(request.body);
    const result = await reviews.submitReview(params.productId, session.data.id, input);
    return reply.status(201).send(result);
  });
}

function requireCsrf(request: FastifyRequest, expectedToken: string): void {
  const token = request.headers["x-csrf-token"];
  if (typeof token !== "string" || !tokensMatch(token, expectedToken)) {
    throw new AppError("CSRF_TOKEN_INVALID", 403);
  }
}
