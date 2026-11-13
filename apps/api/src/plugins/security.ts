import type { FastifyInstance } from "fastify";
import type { ApiConfig } from "@store/shared";
import { AppError } from "../errors.js";

export function installSecurityBaseline(app: FastifyInstance, config: ApiConfig): void {
  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
      throw new AppError("ORIGIN_NOT_ALLOWED", 403);
    }
    if (origin) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Vary", "Origin");
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PATCH,DELETE");
      reply.header("Access-Control-Allow-Headers", "Content-Type,X-Request-Id,X-CSRF-Token");
    }
    if (request.method === "OPTIONS") return reply.status(204).send();
  });

  app.addHook("onSend", async (request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    const isPublicMedia = request.method === "GET" &&
      request.routeOptions.url === "/api/v1/media/:prefix/:filename";
    reply.header("Cache-Control", isPublicMedia ? "public, max-age=31536000, immutable" : "no-store");
  });
}
