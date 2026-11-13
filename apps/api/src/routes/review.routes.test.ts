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

const customerId = "33333333-3333-4333-8333-333333333333";
const productId = "44444444-4444-4444-8444-444444444444";
const csrfToken = "valid-csrf-token-with-good-length-123456";

function createCustomerSessionStore(): CustomerSessionStore {
  return {
    create: vi.fn(),
    get: vi.fn().mockResolvedValue({
      customerId,
      csrfToken,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    }),
    revoke: vi.fn(),
    recordFailedLogin: vi.fn().mockResolvedValue(1),
    clearFailedLogins: vi.fn(),
  };
}

describe("product review routes", () => {
  it("fetches reviews and aggregated rating stats for a product", async () => {
    const mockDb = {
      productReview: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "rev-1",
            productId,
            customerId,
            rating: 5,
            comment: "منتج ممتاز وخامة رائعة",
            isVerifiedPurchase: true,
            createdAt: new Date("2026-11-07T14:00:00Z"),
            customer: { fullName: "سارة أحمد" },
          },
          {
            id: "rev-2",
            productId,
            customerId: "cust-2",
            rating: 4,
            comment: "جميل ومقاس مضبوط",
            isVerifiedPurchase: false,
            createdAt: new Date("2026-11-07T14:30:00Z"),
            customer: { fullName: "مريم خالد" },
          },
        ]),
      },
    } as unknown as PrismaClient;

    const server = buildServer(mockDb, config);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/store/reviews/${productId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items).toHaveLength(2);
    expect(body.stats.totalReviews).toBe(2);
    expect(body.stats.averageRating).toBe(4.5);
    expect(body.stats.ratingDistribution["5"]).toBe(1);
    expect(body.stats.ratingDistribution["4"]).toBe(1);
    expect(body.items[0].customerName).toBe("سارة أ.");
    expect(body.items[0].isVerifiedPurchase).toBe(true);
  });

  it("submits a new product review when authenticated", async () => {
    const sessions = createCustomerSessionStore();
    const mockDb = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          id: customerId,
          fullName: "سارة أحمد",
          phoneE164: "+201012345678",
          isActive: true,
        }),
      },
      order: {
        findFirst: vi.fn().mockResolvedValue({ id: "order-1" }),
      },
      productReview: {
        upsert: vi.fn().mockResolvedValue({
          id: "rev-1",
          productId,
          customerId,
          rating: 5,
          comment: "ممتاز جدًا",
          isVerifiedPurchase: true,
          createdAt: new Date("2026-11-07T14:00:00Z"),
          customer: { fullName: "سارة أحمد" },
        }),
      },
    } as unknown as PrismaClient;

    const server = buildServer(mockDb, config, sessions);

    const response = await server.inject({
      method: "POST",
      url: `/api/v1/store/reviews/${productId}`,
      headers: {
        "x-csrf-token": csrfToken,
      },
      cookies: {
        "__Host-customer_session": "session-123",
      },
      payload: {
        rating: 5,
        comment: "ممتاز جدًا",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.rating).toBe(5);
    expect(body.data.isVerifiedPurchase).toBe(true);
    expect(body.data.customerName).toBe("سارة أ.");
  });

  it("rejects unauthenticated review submission with 401", async () => {
    const mockDb = {} as unknown as PrismaClient;
    const server = buildServer(mockDb, config);

    const response = await server.inject({
      method: "POST",
      url: `/api/v1/store/reviews/${productId}`,
      payload: {
        rating: 5,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
