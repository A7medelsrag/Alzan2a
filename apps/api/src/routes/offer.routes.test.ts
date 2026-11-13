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

describe("store offer and bundle routes", () => {
  const sampleOffer = {
    id: "33333333-3333-4333-8333-333333333333",
    title: "خصم الصيف 20%",
    description: "خصم على التيشيرتات",
    discountType: "PERCENTAGE" as const,
    discountValue: 20,
    maxDiscountCents: 5000,
    freeShipping: false,
    startsAt: null,
    endsAt: null,
    isActive: true,
    products: [
      {
        productId: "00000000-0000-4000-8000-000000000001",
        product: {
          id: "00000000-0000-4000-8000-000000000001",
          name: "تيشيرت صيفي",
          slug: "summer-tshirt",
          imageUrl: null,
          status: "ACTIVE",
        },
      },
    ],
    createdAt: new Date("2026-11-07T12:00:00Z"),
    updatedAt: new Date("2026-11-07T12:00:00Z"),
  };

  const sampleBundle = {
    id: "44444444-4444-4444-8444-444444444444",
    name: "summer-pack",
    title: "باقة الصيف المتكاملة",
    description: "طقم صيفي كامل",
    imageUrl: null,
    priceCents: 35000,
    discountType: null,
    discountValue: null,
    freeShipping: true,
    startsAt: null,
    endsAt: null,
    isActive: true,
    sortOrder: 1,
    items: [
      {
        id: "b-item-1",
        bundleId: "44444444-4444-4444-8444-444444444444",
        productId: "00000000-0000-4000-8000-000000000001",
        defaultVariantId: null,
        quantity: 1,
        product: {
          id: "00000000-0000-4000-8000-000000000001",
          name: "تيشيرت صيفي",
          slug: "summer-tshirt",
          imageUrl: null,
          status: "ACTIVE",
          variants: [
            {
              id: "v-1",
              sku: "TSH-M",
              name: "M",
              priceCents: 20000,
              stockQuantity: 10,
            },
          ],
        },
        defaultVariant: null,
      },
    ],
    createdAt: new Date("2026-11-07T12:00:00Z"),
    updatedAt: new Date("2026-11-07T12:00:00Z"),
  };

  it("lists active offers publicly", async () => {
    const mockDb = {
      productOffer: {
        findMany: vi.fn().mockResolvedValue([sampleOffer]),
      },
    } as unknown as PrismaClient;

    const server = buildServer(mockDb, config);
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/store/offers",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("خصم الصيف 20%");
  });

  it("lists active bundles publicly with calculated availability", async () => {
    const mockDb = {
      bundle: {
        findMany: vi.fn().mockResolvedValue([sampleBundle]),
      },
    } as unknown as PrismaClient;

    const server = buildServer(mockDb, config);
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/store/bundles",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].publicTitle).toBe("باقة الصيف المتكاملة");
    expect(body.data[0].availableStock).toBe(10);
    expect(body.data[0].isFreeShipping).toBe(true);
  });

  it("gets bundle details by id publicly", async () => {
    const mockDb = {
      bundle: {
        findUnique: vi.fn().mockResolvedValue(sampleBundle),
      },
    } as unknown as PrismaClient;

    const server = buildServer(mockDb, config);
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/store/bundles/${sampleBundle.id}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.id).toBe(sampleBundle.id);
  });

  describe("admin offer and bundle management", () => {
    const adminId = "11111111-1111-4111-8111-111111111111";
    const csrfToken = "csrf-token-with-sufficient-length-123456";

    const mockAdminSessionStore = {
      create: vi.fn(),
      get: vi.fn().mockResolvedValue({ adminId, csrfToken, createdAt: Date.now() }),
      revoke: vi.fn(),
      recordFailedLogin: vi.fn().mockResolvedValue(1),
      clearFailedLogins: vi.fn(),
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
        productOffer: {
          findMany: vi.fn().mockResolvedValue([sampleOffer]),
          findUnique: vi.fn().mockResolvedValue(sampleOffer),
          create: vi.fn().mockResolvedValue(sampleOffer),
          update: vi.fn().mockResolvedValue({ ...sampleOffer, title: "Updated Offer" }),
          delete: vi.fn().mockResolvedValue(sampleOffer),
        },
        bundle: {
          findMany: vi.fn().mockResolvedValue([sampleBundle]),
          findUnique: vi.fn().mockResolvedValue(sampleBundle),
          create: vi.fn().mockResolvedValue(sampleBundle),
          update: vi.fn().mockResolvedValue(sampleBundle),
          delete: vi.fn().mockResolvedValue(sampleBundle),
        },
        $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
          return fn({
            productOfferProduct: {
              deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
              createMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
            productOffer: {
              update: vi.fn().mockResolvedValue({ ...sampleOffer, title: "Updated Offer" }),
            },
            bundleItem: {
              deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
              createMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
            bundle: {
              update: vi.fn().mockResolvedValue(sampleBundle),
            },
          });
        }),
      } as unknown as PrismaClient;

      return buildServer(mockDb, config, undefined, mockAdminSessionStore);
    }

    it("rejects offer management for unauthorized role", async () => {
      const server = createAdminServer("SUPPORT");
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/admin/offers",
        cookies: { "__Host-admin_session": "session-123" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("creates offer with valid input and CSRF for authorized admin", async () => {
      const server = createAdminServer("OWNER");
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/admin/offers",
        headers: {
          origin: "http://localhost:5173",
          "x-csrf-token": csrfToken,
        },
        cookies: { "__Host-admin_session": "session-123" },
        payload: {
          name: "عرض جديد",
          discountType: "PERCENTAGE",
          discountValue: 15,
          isFreeShipping: false,
          productIds: ["00000000-0000-4000-8000-000000000001"],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.name).toBe("خصم الصيف 20%");
    });

    it("creates bundle with valid input and CSRF for authorized admin", async () => {
      const server = createAdminServer("OWNER");
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/admin/bundles",
        headers: {
          origin: "http://localhost:5173",
          "x-csrf-token": csrfToken,
        },
        cookies: { "__Host-admin_session": "session-123" },
        payload: {
          internalName: "bundle-internal",
          publicTitle: "باقة جديدة",
          fixedPriceCents: 30000,
          isFreeShipping: true,
          items: [
            {
              productId: "00000000-0000-4000-8000-000000000001",
              quantity: 1,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.publicTitle).toBe("باقة الصيف المتكاملة");
    });
  });
});
