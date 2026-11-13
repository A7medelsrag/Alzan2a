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

describe("admin operations permissions", () => {
  it("keeps manager settings read-only even with a valid CSRF token", async () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    const update = vi.fn();
    const mockDb = {
      adminAccount: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: adminId, username: "manager", role: "MANAGER", isActive: true }),
      },
      storeSetting: { update },
    } as unknown as PrismaClient;
    const sessions = {
      create: vi.fn(),
      get: vi
        .fn()
        .mockResolvedValue({
          adminId,
          csrfToken: "csrf-token-with-sufficient-length-123456",
          createdAt: Date.now(),
        }),
      revoke: vi.fn(),
      recordFailedLogin: vi.fn().mockResolvedValue(1),
      clearFailedLogins: vi.fn(),
    };
    const server = buildServer(mockDb, config, undefined, sessions);
    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/admin/settings",
      headers: {
        origin: "http://localhost:5173",
        "x-csrf-token": "csrf-token-with-sufficient-length-123456",
      },
      cookies: { "__Host-admin_session": "manager-session" },
      payload: {
        storeName: "Shop",
        freeShippingThresholdCents: 100000,
        allowCouponsWithOffers: true,
      },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: { code: "ADMIN_FORBIDDEN" } });
    expect(update).not.toHaveBeenCalled();
    await server.close();
  });

  it("denies staff management to non-owner accounts", async () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    const mockDb = {
      adminAccount: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: adminId,
            username: "inventory",
            role: "INVENTORY",
            isActive: true,
          }),
      },
    } as unknown as PrismaClient;
    const sessions = {
      create: vi.fn(),
      get: vi
        .fn()
        .mockResolvedValue({
          adminId,
          csrfToken: "csrf-token-with-sufficient-length-123456",
          createdAt: Date.now(),
        }),
      revoke: vi.fn(),
      recordFailedLogin: vi.fn().mockResolvedValue(1),
      clearFailedLogins: vi.fn(),
    };
    const server = buildServer(mockDb, config, undefined, sessions);
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/admin/staff",
      cookies: { "__Host-admin_session": "inventory-session" },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: { code: "ADMIN_FORBIDDEN" } });
    await server.close();
  });

  it("returns 503 SERVICE_UNAVAILABLE when creating staff without an MFA encryption key", async () => {
    const ownerId = "11111111-1111-4111-8111-111111111111";
    const mockDb = {
      adminAccount: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: ownerId, username: "owner", role: "OWNER", isActive: true }),
      },
    } as unknown as PrismaClient;
    const sessions = {
      create: vi.fn(),
      get: vi.fn().mockResolvedValue({
        adminId: ownerId,
        csrfToken: "csrf-token-with-sufficient-length-123456",
        createdAt: Date.now(),
      }),
      revoke: vi.fn(),
      recordFailedLogin: vi.fn().mockResolvedValue(1),
      clearFailedLogins: vi.fn(),
    };
    const server = buildServer(mockDb, config, undefined, sessions);
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/admin/staff",
      headers: {
        origin: "http://localhost:5173",
        "x-csrf-token": "csrf-token-with-sufficient-length-123456",
      },
      cookies: { "__Host-admin_session": "owner-session" },
      payload: {
        username: "new_manager",
        password: "very-strong-passphrase-12345",
        role: "MANAGER",
      },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: { code: "SERVICE_UNAVAILABLE" } });
    await server.close();
  });
});
