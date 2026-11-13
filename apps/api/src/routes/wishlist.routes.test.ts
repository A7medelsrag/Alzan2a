import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server.js";
import type { CustomerSessionStore } from "../services/customer-session.store.js";

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

const customerId = "22222222-2222-4222-8222-222222222222";
const sessionData = {
  customerId,
  csrfToken: "valid-customer-csrf-token-1234567890",
};

describe("wishlist routes", () => {
  it("rejects unauthorized access to wishlist", async () => {
    const server = buildServer({} as PrismaClient, config);
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/store/wishlist",
    });
    expect(response.statusCode).toBe(401);
  });

  it("returns customer wishlist when authenticated", async () => {
    const mockDb = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          id: customerId,
          fullName: "فاطمة أحمد",
          email: "fatma@example.com",
          phoneE164: "+201012345678",
          passwordHash: null,
        }),
      },
      wishlistItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaClient;

    const mockCustomerSessionStore: CustomerSessionStore = {
      get: vi.fn().mockResolvedValue(sessionData),
      create: vi.fn(),
      revoke: vi.fn(),
      recordFailedLogin: vi.fn(),
      clearFailedLogins: vi.fn(),
    };

    const server = buildServer(mockDb, config, mockCustomerSessionStore);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/store/wishlist",
      cookies: {
        "__Host-customer_session": "valid-session-token",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [] });
  });

  it("requires valid CSRF token to add item", async () => {
    const mockDb = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          id: customerId,
          fullName: "فاطمة أحمد",
          email: "fatma@example.com",
          phoneE164: "+201012345678",
          passwordHash: null,
        }),
      },
      wishlistItem: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "item_1" }),
      },
    } as unknown as PrismaClient;

    const mockCustomerSessionStore: CustomerSessionStore = {
      get: vi.fn().mockResolvedValue(sessionData),
      create: vi.fn(),
      revoke: vi.fn(),
      recordFailedLogin: vi.fn(),
      clearFailedLogins: vi.fn(),
    };

    const server = buildServer(mockDb, config, mockCustomerSessionStore);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/store/wishlist",
      cookies: {
        "__Host-customer_session": "valid-session-token",
      },
      headers: {
        "x-csrf-token": "wrong-csrf-token",
      },
      payload: {
        productId: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
