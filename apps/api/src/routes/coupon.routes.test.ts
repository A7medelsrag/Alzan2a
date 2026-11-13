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

describe("coupon routes", () => {
  it("validates valid percentage coupon", async () => {
    const mockDb = {
      coupon: {
        findFirst: vi.fn().mockResolvedValue({
          id: "coupon_1",
          code: "SALE10",
          discountType: "PERCENTAGE",
          discountValue: 10,
          minSubtotalCents: 10000,
          maxDiscountCents: 5000,
          usageLimit: 100,
          usageCount: 5,
          isActive: true,
        }),
      },
    } as unknown as PrismaClient;

    const server = buildServer(mockDb, config);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/store/coupons/validate",
      payload: {
        code: "SALE10",
        subtotalCents: 20000,
        shippingFeeCents: 4000,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.isValid).toBe(true);
    expect(body.discountCents).toBe(2000);
  });

  it("returns invalid result when coupon does not exist", async () => {
    const mockDb = {
      coupon: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient;

    const server = buildServer(mockDb, config);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/store/coupons/validate",
      payload: {
        code: "NONEXISTENT",
        subtotalCents: 20000,
        shippingFeeCents: 4000,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.isValid).toBe(false);
    expect(body.discountCents).toBe(0);
  });

  describe("admin coupon routes", () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    const csrfToken = "csrf-token-with-sufficient-length-123456";

    const mockAdminSessionStore = {
      create: vi.fn(),
      get: vi.fn().mockResolvedValue({ adminId, csrfToken, createdAt: Date.now() }),
      revoke: vi.fn(),
      recordFailedLogin: vi.fn().mockResolvedValue(1),
      clearFailedLogins: vi.fn(),
    };

    const mockCouponRecord = {
      id: "22222222-2222-4222-8222-222222222222",
      code: "SUPER50",
      description: "خصم 50 جنيه",
      discountType: "FIXED_AMOUNT",
      discountValue: 5000,
      minSubtotalCents: 20000,
      maxDiscountCents: null,
      usageLimit: 50,
      usageCount: 2,
      startsAt: null,
      endsAt: null,
      isActive: true,
      createdAt: new Date("2026-11-07T12:00:00Z"),
      updatedAt: new Date("2026-11-07T12:00:00Z"),
    };

    function createAdminServer(role: string = "OWNER") {
      const mockDb = {
        adminAccount: {
          findUnique: vi.fn().mockResolvedValue({
            id: adminId,
            username: "admin_user",
            role,
            isActive: true,
          }),
        },
        coupon: {
          findMany: vi.fn().mockResolvedValue([mockCouponRecord]),
          findUnique: vi.fn().mockResolvedValue(mockCouponRecord),
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(mockCouponRecord),
          update: vi.fn().mockResolvedValue({ ...mockCouponRecord, isActive: false }),
          delete: vi.fn().mockResolvedValue(mockCouponRecord),
        },
      } as unknown as PrismaClient;

      return buildServer(mockDb, config, undefined, mockAdminSessionStore);
    }

    it("lists all coupons for authorized admin", async () => {
      const server = createAdminServer();
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/admin/coupons",
        cookies: { "__Host-admin_session": "session-123" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].code).toBe("SUPER50");
    });

    it("creates a new coupon with valid input and CSRF", async () => {
      const server = createAdminServer();
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/admin/coupons",
        headers: {
          origin: "http://localhost:5173",
          "x-csrf-token": csrfToken,
        },
        cookies: { "__Host-admin_session": "session-123" },
        payload: {
          code: "SUPER50",
          description: "خصم 50 جنيه",
          discountType: "FIXED_AMOUNT",
          discountValue: 5000,
          minSubtotalCents: 20000,
          isActive: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.code).toBe("SUPER50");
    });

    it("updates an existing coupon", async () => {
      const server = createAdminServer();
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/admin/coupons/${mockCouponRecord.id}`,
        headers: {
          origin: "http://localhost:5173",
          "x-csrf-token": csrfToken,
        },
        cookies: { "__Host-admin_session": "session-123" },
        payload: {
          isActive: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.isActive).toBe(false);
    });

    it("deletes a coupon", async () => {
      const server = createAdminServer();
      const response = await server.inject({
        method: "DELETE",
        url: `/api/v1/admin/coupons/${mockCouponRecord.id}`,
        headers: {
          origin: "http://localhost:5173",
          "x-csrf-token": csrfToken,
        },
        cookies: { "__Host-admin_session": "session-123" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it("denies access to staff with INVENTORY role", async () => {
      const server = createAdminServer("INVENTORY");
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/admin/coupons",
        cookies: { "__Host-admin_session": "session-123" },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
