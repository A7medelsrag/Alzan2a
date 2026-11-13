import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { CreateOrderInput } from "@store/shared";
import { CheckoutUnavailableError, OrderRepository } from "../repositories/order.repository.js";
import { OrderService } from "./order.service.js";

const mockSampleOrder = {
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
  idempotencyKey: "test-idempotency-key-123456",
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

const sampleInput: CreateOrderInput = {
  customer: {
    fullName: "فاطمة حسن",
    phone: "01012345678",
    email: "fatma@example.com",
  },
  shippingAddress: {
    governorate: "القاهرة",
    cityArea: "مدينة نصر",
    detailedAddress: "شارع الطيران، مبنى 5",
    landmark: "بجوار المسجد",
  },
  items: [{ variantId: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d", quantity: 1 }],
};

describe("OrderService", () => {
  it("turns an unavailable checkout into a stable 409 error", async () => {
    const repository = {
      findByIdempotencyKey: async () => null,
      createAtomically: async () => {
        throw new CheckoutUnavailableError();
      },
    } as unknown as OrderRepository;
    const service = new OrderService(repository, "test-secret");

    await expect(service.create(sampleInput, "fJ3_O4fJ3_O4fJ3_O4fJ")).rejects.toMatchObject({
      code: "OUT_OF_STOCK_OR_UNAVAILABLE",
      statusCode: 409,
    });
  });

  it("creates a guest order and generates an HMAC receipt token", async () => {
    const repository = {
      findByIdempotencyKey: async () => null,
      createAtomically: vi.fn().mockResolvedValue(mockSampleOrder),
    } as unknown as OrderRepository;
    const service = new OrderService(repository, "test-secret");

    const result = await service.create(sampleInput, "fJ3_O4fJ3_O4fJ3_O4fJ", null);

    expect(result.idempotentReplay).toBe(false);
    expect(result.data.id).toBe(mockSampleOrder.id);
    expect(result.data.customerPhone).toBe("01012345678");
    expect(result.data.totalCents).toBe(19000);
    expect(result.guestReceiptToken).toBeDefined();
    expect(result.guestReceiptToken).toContain(mockSampleOrder.id);
  });

  it("replays existing order when idempotency key is repeated", async () => {
    const repository = {
      findByIdempotencyKey: async () => mockSampleOrder,
      createAtomically: vi.fn(),
    } as unknown as OrderRepository;
    const service = new OrderService(repository, "test-secret");

    const result = await service.create(sampleInput, "fJ3_O4fJ3_O4fJ3_O4fJ", null);

    expect(result.idempotentReplay).toBe(true);
    expect(result.data.id).toBe(mockSampleOrder.id);
    expect(repository.createAtomically).not.toHaveBeenCalled();
  });

  it("secures guest receipt access: allows valid guest receipt token and denies unauthorized requests with 404", async () => {
    const repository = {
      findById: async (id: string) => (id === mockSampleOrder.id ? mockSampleOrder : null),
      findByIdempotencyKey: async () => null,
      createAtomically: vi.fn().mockResolvedValue(mockSampleOrder),
    } as unknown as OrderRepository;
    const service = new OrderService(repository, "test-secret");

    // Create a valid guest token
    const { guestReceiptToken } = await service.create(sampleInput, "fJ3_O4fJ3_O4fJ3_O4fJ", null);
    if (!guestReceiptToken) throw new Error("Expected guestReceiptToken");

    // Valid guest token -> success
    const result = await service.getOrderById(mockSampleOrder.id, undefined, guestReceiptToken);
    expect(result.data.id).toBe(mockSampleOrder.id);

    // Invalid token -> 404 ORDER_NOT_FOUND (anti-IDOR)
    await expect(service.getOrderById(mockSampleOrder.id, undefined, "invalid-token"))
      .rejects.toMatchObject({ code: "ORDER_NOT_FOUND", statusCode: 404 });

    // No token -> 404 ORDER_NOT_FOUND
    await expect(service.getOrderById(mockSampleOrder.id))
      .rejects.toMatchObject({ code: "ORDER_NOT_FOUND", statusCode: 404 });
  });

  it("secures customer order access: allows owner and denies other customers with 404", async () => {
    const customerOrder = {
      ...mockSampleOrder,
      customerId: "cust-owner-123",
    };
    const repository = {
      findById: async (id: string) => (id === customerOrder.id ? customerOrder : null),
      listByCustomerId: async (customerId: string) => (customerId === "cust-owner-123" ? [customerOrder] : []),
    } as unknown as OrderRepository;
    const service = new OrderService(repository, "test-secret");

    // Owner accesses -> success
    const result = await service.getOrderById(customerOrder.id, "cust-owner-123");
    expect(result.data.id).toBe(customerOrder.id);

    // Different customer accesses -> 404 (anti-IDOR)
    await expect(service.getOrderById(customerOrder.id, "cust-attacker-999"))
      .rejects.toMatchObject({ code: "ORDER_NOT_FOUND", statusCode: 404 });

    // List customer orders
    const list = await service.listCustomerOrders("cust-owner-123");
    expect(list.data).toHaveLength(1);
    expect(list.data[0]?.id).toBe(customerOrder.id);
  });

  it("updates order status by admin and handles stock conflict gracefully", async () => {
    const updatedOrder = {
      ...mockSampleOrder,
      status: "CANCELLED" as const,
    };
    const repository = {
      findById: async (id: string) => (id === mockSampleOrder.id ? mockSampleOrder : null),
      updateStatus: vi.fn().mockResolvedValue(updatedOrder),
    } as unknown as OrderRepository;
    const service = new OrderService(repository, "test-secret");

    const res = await service.updateOrderStatusByAdmin(mockSampleOrder.id, {
      status: "CANCELLED",
    });
    expect(res.data.status).toBe("CANCELLED");
    expect(repository.updateStatus).toHaveBeenCalledWith(mockSampleOrder.id, { status: "CANCELLED" }, undefined);

    // Throws 409 when reactivating order fails due to insufficient stock
    const failingRepo = {
      findById: async (id: string) => (id === mockSampleOrder.id ? { ...mockSampleOrder, status: "PROCESSING" as const } : null),
      updateStatus: vi.fn().mockRejectedValue(new CheckoutUnavailableError("Insufficient stock")),
    } as unknown as OrderRepository;
    const failingService = new OrderService(failingRepo, "test-secret");

    await expect(
      failingService.updateOrderStatusByAdmin(mockSampleOrder.id, { status: "SHIPPED" }),
    ).rejects.toMatchObject({
      code: "OUT_OF_STOCK_OR_UNAVAILABLE",
      statusCode: 409,
    });
  });

  it("enforces order state machine transition rules", async () => {
    // 1. Cannot cancel after shipping
    const shippedOrder = { ...mockSampleOrder, status: "SHIPPED" as const };
    const repo1 = {
      findById: async () => shippedOrder,
    } as unknown as OrderRepository;
    const service1 = new OrderService(repo1, "test-secret");

    await expect(
      service1.updateOrderStatusByAdmin(shippedOrder.id, { status: "CANCELLED" }),
    ).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
      statusCode: 400,
    });

    // 2. Cannot return before shipping
    const pendingOrder = { ...mockSampleOrder, status: "PENDING" as const };
    const repo2 = {
      findById: async () => pendingOrder,
    } as unknown as OrderRepository;
    const service2 = new OrderService(repo2, "test-secret");

    await expect(
      service2.updateOrderStatusByAdmin(pendingOrder.id, { status: "RETURNED" }),
    ).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
      statusCode: 400,
    });

    // 3. Terminal state CANCELLED cannot transition
    const cancelledOrder = { ...mockSampleOrder, status: "CANCELLED" as const };
    const repo3 = {
      findById: async () => cancelledOrder,
    } as unknown as OrderRepository;
    const service3 = new OrderService(repo3, "test-secret");

    await expect(
      service3.updateOrderStatusByAdmin(cancelledOrder.id, { status: "CONFIRMED" }),
    ).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
      statusCode: 400,
    });
  });

  it("retries P2034 serialization conflicts during order creation and status updates", async () => {
    const p2034Error = new Prisma.PrismaClientKnownRequestError("Write conflict", {
      code: "P2034",
      clientVersion: "6.19.3",
    });

    const createAtomically = vi
      .fn()
      .mockRejectedValueOnce(p2034Error)
      .mockResolvedValueOnce(mockSampleOrder);
    const repo = {
      findByIdempotencyKey: async () => null,
      createAtomically,
    } as unknown as OrderRepository;
    const service = new OrderService(repo, "test-secret");

    const created = await service.create(sampleInput, "fJ3_O4fJ3_O4fJ3_O4fJ", null);
    expect(created.data.id).toBe(mockSampleOrder.id);
    expect(createAtomically).toHaveBeenCalledTimes(2);

    const alwaysConflictingRepo = {
      findByIdempotencyKey: async () => null,
      createAtomically: vi.fn().mockRejectedValue(p2034Error),
    } as unknown as OrderRepository;
    const conflictingService = new OrderService(alwaysConflictingRepo, "test-secret");

    await expect(
      conflictingService.create(sampleInput, "fJ3_O4fJ3_O4fJ3_O4fJ", null),
    ).rejects.toMatchObject({
      code: "CONCURRENT_MODIFICATION",
      statusCode: 409,
    });
    expect(alwaysConflictingRepo.createAtomically).toHaveBeenCalledTimes(3);

    const updateStatus = vi
      .fn()
      .mockRejectedValueOnce(p2034Error)
      .mockResolvedValueOnce({ ...mockSampleOrder, status: "CONFIRMED" as const });
    const statusRepo = {
      findById: async () => mockSampleOrder,
      updateStatus,
    } as unknown as OrderRepository;
    const statusService = new OrderService(statusRepo, "test-secret");

    const updated = await statusService.updateOrderStatusByAdmin(mockSampleOrder.id, {
      status: "CONFIRMED",
    });
    expect(updated.data.status).toBe("CONFIRMED");
    expect(updateStatus).toHaveBeenCalledTimes(2);
  });
});
