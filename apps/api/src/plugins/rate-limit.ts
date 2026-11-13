import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { ApiConfig } from "@store/shared";
import { AppError } from "../errors.js";

export function installRateLimit(app: FastifyInstance, config: ApiConfig): void {
  app.register(rateLimit, {
    global: true,
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: (request) => request.ip,
    hook: "onRequest",
    errorResponseBuilder: () => new AppError("RATE_LIMITED", 429),
  });
}
