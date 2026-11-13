import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  wishlistItemInputSchema,
  wishlistSyncInputSchema,
} from "@store/shared";
import { AppError } from "../errors.js";
import type { CustomerService } from "../services/customer.service.js";
import { customerSessionCookieName } from "./customer.routes.js";
import { tokensMatch } from "../services/customer-session.store.js";
import type { WishlistService } from "../services/wishlist.service.js";

export function registerWishlistRoutes(
  app: FastifyInstance,
  wishlists: WishlistService,
  customers: CustomerService,
): void {
  app.get("/", async (request, reply) => {
    const session = await customers.getSession(request.cookies[customerSessionCookieName]);
    return reply.header("Cache-Control", "no-store").send(await wishlists.getWishlist(session.data.id));
  });

  app.post("/", async (request, reply) => {
    const session = await customers.getSession(request.cookies[customerSessionCookieName]);
    requireCsrf(request, session.csrfToken);
    const input = wishlistItemInputSchema.parse(request.body);
    const result = await wishlists.addToWishlist(session.data.id, input);
    return reply.status(201).send(result);
  });

  app.delete("/:id", async (request, reply) => {
    const session = await customers.getSession(request.cookies[customerSessionCookieName]);
    requireCsrf(request, session.csrfToken);
    const { id } = request.params as { id: string };
    const result = await wishlists.removeFromWishlist(session.data.id, id);
    return reply.send(result);
  });

  app.post("/sync", async (request, reply) => {
    const session = await customers.getSession(request.cookies[customerSessionCookieName]);
    requireCsrf(request, session.csrfToken);
    const input = wishlistSyncInputSchema.parse(request.body);
    const result = await wishlists.syncWishlist(session.data.id, input.items);
    return reply.send(result);
  });
}

function requireCsrf(request: FastifyRequest, expectedToken: string): void {
  const token = request.headers["x-csrf-token"];
  if (typeof token !== "string" || !tokensMatch(token, expectedToken)) {
    throw new AppError("CSRF_VALIDATION_FAILED", 403);
  }
}
