import { afterEach, describe, expect, it, vi } from "vitest";
import { getOrder, placeOrder } from "./orders.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const mockOrder = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "PENDING" as const,
  customerName: "فاطمة حسن",
  customerPhone: "01012345678",
  governorate: "القاهرة",
  cityArea: "مدينة نصر",
  detailedAddress: "شارع الطيران",
  subtotalCents: 15000,
  shippingFeeCents: 4000,
  discountCents: 0,
  totalCents: 19000,
  items: [],
  createdAt: "2026-11-07T10:00:00.000Z",
  updatedAt: "2026-11-07T10:00:00.000Z",
};

describe("orders web client API", () => {
  it("places an order with idempotency key header and parses response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: mockOrder, guestReceiptToken: "mock-receipt-token" }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const input = {
      customer: { fullName: "فاطمة حسن", phone: "01012345678" },
      shippingAddress: { governorate: "القاهرة", cityArea: "مدينة نصر", detailedAddress: "شارع الطيران" },
      items: [{ variantId: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d", quantity: 1 }],
    };

    const result = await placeOrder(input, "custom-idempotency-key", "customer-csrf-token");
    expect(result.data.id).toBe(mockOrder.id);
    expect(result.guestReceiptToken).toBe("mock-receipt-token");

    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("/api/v1/store/orders");
    const init = call?.[1];
    expect((init?.headers as Record<string, string>)["Idempotency-Key"]).toBe("custom-idempotency-key");
    expect((init?.headers as Record<string, string>)["X-CSRF-Token"]).toBe("customer-csrf-token");
  });

  it("fetches single order with guest receipt token header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: mockOrder }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getOrder(mockOrder.id, "my-receipt-token");
    expect(result.data.id).toBe(mockOrder.id);

    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`/api/v1/store/orders/${mockOrder.id}`);
    const init = call?.[1];
    expect((init?.headers as Record<string, string>)["X-Guest-Receipt-Token"]).toBe("my-receipt-token");
  });
});
