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

const sampleOrder = {
  id: "11111111-1111-4111-8111-111111111111",
  customerId: null,
  status: "PENDING" as const,
  customerName: "فاطمة حسن",
  customerPhone: "+201012345678",
  customerEmail: "fatma@example.com",
  governorate: "القاهرة",
  cityArea: "مدينة نصر",
  detailedAddress: "شارع الطيران، مبنى 5",
  landmark: "بجوار المسجد",
  subtotalCents: 15000,
  shippingFeeCents: 4000,
  discountCents: 0,
  totalCents: 19000,
  idempotencyKey: "test-idempotency-key-abcdef",
  items: [
    {
      id: "item-1",
      variantId: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
      quantity: 1,
      unitPriceCents: 15000,
      variant: {
        name: "مقاس M",
        product: { name: "فستان صيفي" },
      },
    },
  ],
  createdAt: new Date("2026-11-07T10:00:00.000Z"),
  updatedAt: new Date("2026-11-07T10:00:00.000Z"),
  courierName: null,
  trackingNumber: null,
};

function createServer() {
  const findUnique = vi.fn().mockImplementation(({ where }: { where: { idempotencyKey?: string; id?: string } }) => {
    if (where.idempotencyKey === sampleOrder.idempotencyKey) return Promise.resolve(sampleOrder);
    if (where.id === sampleOrder.id) return Promise.resolve(sampleOrder);
    return Promise.resolve(null);
  });

  const transaction = vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
    return fn({
      productVariant: {
        findMany: vi.fn().mockResolvedValue([
          { id: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d", productId: "00000000-0000-4000-8000-000000000001", priceCents: 15000, stockQuantity: 5, name: "مقاس M" },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      shippingRate: { findUnique: vi.fn().mockResolvedValue({ governorate: "القاهرة", priceCents: 4000, isEnabled: true }) },
      storeSetting: { findUnique: vi.fn().mockResolvedValue({ freeShippingThresholdCents: 100000, allowCouponsWithOffers: true, dailyOrderLimitPerPhone: null }) },
      orderEvent: { create: vi.fn().mockResolvedValue({}) },
      stockMovement: { create: vi.fn().mockResolvedValue({}) },
      productOffer: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      bundle: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      coupon: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
      order: {
        create: vi.fn().mockResolvedValue(sampleOrder),
      },
    });
  });

  const database = {
    order: { findUnique },
    $transaction: transaction,
  } as unknown as PrismaClient;

  return {
    app: buildServer(database, config),
  };
}

describe("store order routes", () => {
  it("creates a guest order and sets the __Host-guest_receipt cookie", async () => {
    const { app } = createServer();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/store/orders",
      headers: {
        "idempotency-key": "new-order-idempotency-key-1234",
      },
      payload: {
        customer: {
          fullName: "فاطمة حسن",
          phone: "01012345678",
          email: "fatma@example.com",
        },
        shippingAddress: {
          governorate: "القاهرة",
          cityArea: "مدينة نصر",
          detailedAddress: "شارع الطيران، مبنى 5",
        },
        items: [
          { variantId: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d", quantity: 1 },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.customerName).toBe("فاطمة حسن");
    expect(body.data.customerPhone).toBe("01012345678");
    expect(body.guestReceiptToken).toBeDefined();
    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.headers["set-cookie"]).toContain("__Host-guest_receipt");
    await app.close();
  });

  it("requires an Idempotency-Key header", async () => {
    const { app } = createServer();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/store/orders",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("denies access to GET /orders for unauthenticated users", async () => {
    const { app } = createServer();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/store/orders",
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("requires a valid X-CSRF-Token when placing an order with an active customer session", async () => {
    const customerId = "22222222-2222-4222-8222-222222222222";
    const csrfToken = "customer-csrf-token-with-sufficient-length";
    const customerOrder = { ...sampleOrder, customerId };
    const database = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          id: customerId,
          fullName: "فاطمة حسن",
          phone: "+201012345678",
          email: "fatma@example.com",
          createdAt: new Date("2026-11-01T00:00:00.000Z"),
        }),
      },
      order: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          productVariant: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
                productId: "00000000-0000-4000-8000-000000000001",
                priceCents: 15000,
                stockQuantity: 5,
                name: "مقاس M",
              },
            ]),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          shippingRate: { findUnique: vi.fn().mockResolvedValue({ governorate: "القاهرة", priceCents: 4000, isEnabled: true }) },
          storeSetting: { findUnique: vi.fn().mockResolvedValue({ freeShippingThresholdCents: 100000, allowCouponsWithOffers: true, dailyOrderLimitPerPhone: null }) },
          orderEvent: { create: vi.fn().mockResolvedValue({}) },
          stockMovement: { create: vi.fn().mockResolvedValue({}) },
          productOffer: { findMany: vi.fn().mockResolvedValue([]) },
          bundle: { findMany: vi.fn().mockResolvedValue([]) },
          coupon: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue({}) },
          order: { create: vi.fn().mockResolvedValue(customerOrder) },
        }),
      ),
    } as unknown as PrismaClient;

    const customerSessions = {
      create: vi.fn(),
      get: vi.fn().mockResolvedValue({ customerId, csrfToken, createdAt: Date.now() }),
      revoke: vi.fn(),
      recordFailedLogin: vi.fn().mockResolvedValue(1),
      clearFailedLogins: vi.fn(),
    };

    const app = buildServer(database, config, customerSessions);
    const payload = {
      customer: {
        fullName: "فاطمة حسن",
        phone: "01012345678",
        email: "fatma@example.com",
      },
      shippingAddress: {
        governorate: "القاهرة",
        cityArea: "مدينة نصر",
        detailedAddress: "شارع الطيران، مبنى 5",
      },
      items: [{ variantId: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d", quantity: 1 }],
    };

    const missingCsrf = await app.inject({
      method: "POST",
      url: "/api/v1/store/orders",
      cookies: { "__Host-customer_session": "customer-session-token" },
      headers: { "idempotency-key": "customer-order-key-1234" },
      payload,
    });
    expect(missingCsrf.statusCode).toBe(403);
    expect(missingCsrf.json()).toEqual({ error: { code: "CSRF_VALIDATION_FAILED" } });

    const validCsrf = await app.inject({
      method: "POST",
      url: "/api/v1/store/orders",
      cookies: { "__Host-customer_session": "customer-session-token" },
      headers: {
        "idempotency-key": "customer-order-key-1234",
        "x-csrf-token": csrfToken,
      },
      payload,
    });
    expect(validCsrf.statusCode).toBe(201);
    expect(validCsrf.json().data.customerId).toBe(customerId);
    await app.close();
  });
});
