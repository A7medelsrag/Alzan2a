import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  listAdminCoupons,
  updateAdminCoupon,
} from "./coupons.js";

const mockCoupon = {
  id: "22222222-2222-4222-8222-222222222222",
  code: "DISCOUNT10",
  description: "خصم 10%",
  discountType: "PERCENTAGE" as const,
  discountValue: 10,
  minSubtotalCents: 10000,
  maxDiscountCents: 5000,
  usageLimit: 100,
  usageCount: 1,
  startsAt: null,
  endsAt: null,
  isActive: true,
  createdAt: "2026-11-07T10:00:00Z",
  updatedAt: "2026-11-07T10:00:00Z",
};

describe("Admin Coupons API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists coupons successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockCoupon] }),
      }),
    );

    const result = await listAdminCoupons();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].code).toBe("DISCOUNT10");
  });

  it("creates a coupon successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ data: mockCoupon }),
      }),
    );

    const result = await createAdminCoupon(
      {
        code: "DISCOUNT10",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minSubtotalCents: 10000,
        isActive: true,
      },
      "csrf-token-123",
    );

    expect(result.data.code).toBe("DISCOUNT10");
  });

  it("updates and deletes coupons", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { ...mockCoupon, isActive: false } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        }),
    );

    const updateResult = await updateAdminCoupon(mockCoupon.id, { isActive: false }, "csrf-token-123");
    expect(updateResult.data.isActive).toBe(false);

    const deleteResult = await deleteAdminCoupon(mockCoupon.id, "csrf-token-123");
    expect(deleteResult.success).toBe(true);
  });
});
