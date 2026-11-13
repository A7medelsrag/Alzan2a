import { Prisma, type PrismaClient } from "@prisma/client";
import { add, formatEGP } from "@store/shared";
import { describe, expect, it, vi } from "vitest";
import { buildServer } from "./server.js";
import { HealthService } from "./services/health.service.js";

const config = {
  environment: "test" as const,
  host: "127.0.0.1",
  port: 3000,
  databaseUrl: "postgresql://user:password@localhost:5432/catalog",
  allowedOrigins: ["http://localhost:5173"],
  logLevel: "silent" as const,
  bodyLimitBytes: 1_024,
  rateLimitMax: 1,
  rateLimitWindowMs: 60_000,
  media: {
    driver: "local" as const,
    localDirectory: ".media-test",
    publicAssetBaseUrl: "https://localhost:3000/api/v1/media",
  },
};

function buildTestServer(databaseIsReady = true) {
  const database = {
    $queryRawUnsafe: async () => {
      if (!databaseIsReady) throw new Error("Database unavailable");
      return [{ "?column?": 1 }];
    },
  } as unknown as PrismaClient;
  return buildServer(database, config);
}

describe("Fastify server", () => {
  it("exposes liveness without checking dependencies", async () => {
    const app = buildTestServer(false);
    const response = await app.inject({ method: "GET", url: "/health/live" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("reports dependency failure through readiness without exposing internals", async () => {
    const app = buildTestServer(false);
    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: { code: "DEPENDENCY_UNAVAILABLE" } });
  });

  it("allows only configured browser origins", async () => {
    const app = buildTestServer();
    const allowed = await app.inject({ method: "OPTIONS", url: "/health/live", headers: { origin: "http://localhost:5173" } });
    const denied = await app.inject({ method: "GET", url: "/health/live", headers: { origin: "https://untrusted.example" } });

    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toEqual({ error: { code: "ORIGIN_NOT_ALLOWED" } });
  });

  it("does not rate-limit deployment health probes", async () => {
    const app = buildTestServer();
    const first = await app.inject({ method: "GET", url: "/health/live" });
    const second = await app.inject({ method: "GET", url: "/health/live" });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
  });

  it("serves catalog searches and includes products from the requested category's children", async () => {
    const count = vi.fn().mockResolvedValue(1);
    const findMany = vi.fn().mockResolvedValue([]);
    const database = {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
      $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
      product: { count, findMany },
    } as unknown as PrismaClient;
    const app = buildServer(database, config);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/store/products?category=women-clothing&search=dress",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: [], total: 1 });
    expect(count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: "ACTIVE",
        category: {
          OR: [
            { slug: "women-clothing" },
            { parent: { is: { slug: "women-clothing" } } },
          ],
        },
        OR: expect.arrayContaining([
          { name: { contains: "dress", mode: "insensitive" } },
        ]),
      }),
    }));
    await app.close();
  });

  it("serves the live homepage configuration without exposing inactive content", async () => {
    const bannerFindMany = vi.fn().mockResolvedValue([]);
    const sectionFindMany = vi.fn().mockResolvedValue([]);
    const database = {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
      homepageBanner: { findMany: bannerFindMany },
      homepageSection: { findMany: sectionFindMany },
    } as unknown as PrismaClient;
    const app = buildServer(database, config);
    const response = await app.inject({ method: "GET", url: "/api/v1/store/homepage" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { banners: [], sections: [] } });
    expect(sectionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ isEnabled: true }),
    }));
    await app.close();
  });

  it("keeps homepage content management behind an admin session", async () => {
    const app = buildTestServer();
    const response = await app.inject({ method: "GET", url: "/api/v1/admin/homepage" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: { code: "ADMIN_UNAUTHENTICATED" } });
    await app.close();
  });

  it("reports an unapplied homepage migration as a setup requirement", async () => {
    const database = {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
      homepageBanner: {
        findMany: async () => {
          throw new Prisma.PrismaClientKnownRequestError("Table does not exist", {
            code: "P2021",
            clientVersion: "6.19.3",
          });
        },
      },
      homepageSection: { findMany: async () => [] },
    } as unknown as PrismaClient;
    const app = buildServer(database, config);
    const response = await app.inject({ method: "GET", url: "/api/v1/store/homepage" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: { code: "HOMEPAGE_SETUP_REQUIRED" } });
    await app.close();
  });

  it("uses forwarded client IP for rate limiting when trustProxy is enabled", async () => {
    const database = {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
      homepageBanner: { findMany: async () => [] },
      homepageSection: { findMany: async () => [] },
    } as unknown as PrismaClient;
    const app = buildServer(database, { ...config, trustProxy: true, rateLimitMax: 1 });

    const firstClient = await app.inject({
      method: "GET",
      url: "/api/v1/store/homepage",
      headers: { "x-forwarded-for": "198.51.100.10" },
    });
    const secondClient = await app.inject({
      method: "GET",
      url: "/api/v1/store/homepage",
      headers: { "x-forwarded-for": "198.51.100.11" },
    });
    const firstClientAgain = await app.inject({
      method: "GET",
      url: "/api/v1/store/homepage",
      headers: { "x-forwarded-for": "198.51.100.10" },
    });

    expect(firstClient.statusCode).toBe(200);
    expect(secondClient.statusCode).toBe(200);
    expect(firstClientAgain.statusCode).toBe(429);
    await app.close();
  });

  it("applies global rate limiting to /api/v1/store/shipping/rates", async () => {
    const database = {
      $queryRawUnsafe: async () => [{ "?column?": 1 }],
      shippingRate: { findMany: async () => [] },
    } as unknown as PrismaClient;
    const app = buildServer(database, { ...config, rateLimitMax: 1 });

    const first = await app.inject({ method: "GET", url: "/api/v1/store/shipping/rates" });
    const second = await app.inject({ method: "GET", url: "/api/v1/store/shipping/rates" });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
    await app.close();
  });

  it("checks Redis readiness when configured", async () => {
    const db = { $queryRawUnsafe: async () => [{ "?column?": 1 }] };
    const healthyHealth = new HealthService(db, { isOpen: true, ping: async () => "PONG" });
    const closedRedisHealth = new HealthService(db, { isOpen: false, ping: async () => "PONG" });
    const failingRedisHealth = new HealthService(db, {
      isOpen: true,
      ping: async () => {
        throw new Error("Redis timeout");
      },
    });

    await expect(healthyHealth.isReady()).resolves.toBe(true);
    await expect(closedRedisHealth.isReady()).resolves.toBe(false);
    await expect(failingRedisHealth.isReady()).resolves.toBe(false);
  });

  it("can import and use money utilities from @store/shared", () => {
    expect(add(150, 350)).toBe(500);
    expect(formatEGP(500)).toBe("5.00 ج.م");
  });
});
