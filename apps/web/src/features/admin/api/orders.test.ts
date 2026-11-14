import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminOrder, listAdminOrders, updateAdminOrderStatus } from "./orders";

describe("admin orders api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists orders with query params", async () => {
    const mockResponse = {
      data: [{ id: "order_1", status: "PENDING" }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const res = await listAdminOrders({ status: "PENDING", page: 1, pageSize: 50 });
    expect(res.data).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("status=PENDING&page=1&pageSize=50"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("fetches single order by id", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "order_123" } }),
    });

    const res = await getAdminOrder("order_123");
    expect(res.data.id).toBe("order_123");
  });

  it("updates order status with csrf token", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "order_123", status: "SHIPPED" } }),
    });

    const res = await updateAdminOrderStatus(
      "order_123",
      { status: "SHIPPED", courierName: "Bosta", trackingNumber: "BST123456" },
      "csrf-token-xyz",
    );
    expect(res.data.status).toBe("SHIPPED");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/orders/order_123",
      expect.objectContaining({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "csrf-token-xyz",
        },
      }),
    );
  });
});
