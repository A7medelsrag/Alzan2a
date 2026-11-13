import type { FastifyInstance } from "fastify";
import { HealthService } from "../services/health.service.js";

export function registerHealthRoutes(app: FastifyInstance, health: HealthService): void {
  app.get("/health/live", { config: { rateLimit: false } }, async (_request, reply) => reply.status(200).send({ status: "ok" }));

  app.get("/health/ready", { config: { rateLimit: false } }, async (_request, reply) => {
    if (await health.isReady()) return reply.status(200).send({ status: "ready" });
    return reply.status(503).send({ error: { code: "DEPENDENCY_UNAVAILABLE" } });
  });
}
