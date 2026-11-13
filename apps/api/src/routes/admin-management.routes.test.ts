import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server.js";

const config = {
  environment: "test" as const,
  host: "127.0.0.1",
  port: 3000,
  databaseUrl: "postgresql://user:password@localhost:5432/catalog",
  allowedOrigins: ["http://localhost:5173"],
  logLevel: "silent" as const,
  bodyLimitBytes: 10_000,
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,
  media: {
    driver: "local" as const,
    localDirectory: ".media-test",
    publicAssetBaseUrl: "https://localhost:3000/api/v1/media",
  },
};

describe("admin management routes", () => {
  it("requires CSRF validation before creating catalog data", async () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    const createProduct = vi.fn();
    const mockDb = {
      adminAccount: {
        findUnique: vi.fn().mockResolvedValue({ id: adminId, username: "owner", role: "OWNER", isActive: true }),
      },
      product: { create: createProduct },
    } as unknown as PrismaClient;
    const sessionStore = {
      create: vi.fn(),
      get: vi.fn().mockResolvedValue({ adminId, csrfToken: "csrf-token-with-sufficient-length-123456", createdAt: Date.now() }),
      revoke: vi.fn(),
      recordFailedLogin: vi.fn().mockResolvedValue(1),
      clearFailedLogins: vi.fn(),
    };
    const server = buildServer(mockDb, config, undefined, sessionStore);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/admin/products",
      headers: { origin: "http://localhost:5173" },
      cookies: { "__Host-admin_session": "session-123" },
      payload: { name: "Valid product", description: "Product description", categoryId: "22222222-2222-4222-8222-222222222222" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: { code: "CSRF_VALIDATION_FAILED" } });
    expect(createProduct).not.toHaveBeenCalled();
    await server.close();
  });

  it("does not expose a hard-delete route for products", async () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    const deleteProduct = vi.fn();
    const mockDb = { product: { delete: deleteProduct } } as unknown as PrismaClient;
    const sessionStore = {
      create: vi.fn(), get: vi.fn(), revoke: vi.fn(),
      recordFailedLogin: vi.fn().mockResolvedValue(1), clearFailedLogins: vi.fn(),
    };
    const server = buildServer(mockDb, config, undefined, sessionStore);
    const response = await server.inject({ method: "DELETE", url: `/api/v1/admin/products/${adminId}` });
    expect(response.statusCode).toBe(404);
    expect(deleteProduct).not.toHaveBeenCalled();
    await server.close();
  });
});
