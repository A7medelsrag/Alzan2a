import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAdminOffer,
  deleteAdminOffer,
  listAdminOffers,
  updateAdminOffer,
} from "./offers.js";

const mockOffer = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "خصم 20%",
  description: "عرض الصيف",
  discountType: "PERCENTAGE" as const,
  discountValue: 20,
  maxDiscountCents: 4000,
  isFreeShipping: false,
  startsAt: null,
  endsAt: null,
  isActive: true,
  productIds: ["prod-1"],
  createdAt: "2026-11-07T10:00:00Z",
  updatedAt: "2026-11-07T10:00:00Z",
};

describe("Admin Offers API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists offers successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockOffer] }),
      }),
    );

    const result = await listAdminOffers();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("خصم 20%");
  });

  it("creates an offer successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ data: mockOffer }),
      }),
    );

    const result = await createAdminOffer(
      {
        name: "خصم 20%",
        discountType: "PERCENTAGE",
        discountValue: 20,
        isFreeShipping: false,
        productIds: ["prod-1"],
      },
      "csrf-token-123",
    );

    expect(result.data.name).toBe("خصم 20%");
  });

  it("updates and deletes offers successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { ...mockOffer, isActive: false } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        }),
    );

    const updateRes = await updateAdminOffer(mockOffer.id, { isActive: false }, "csrf-token-123");
    expect(updateRes.data.isActive).toBe(false);

    const deleteRes = await deleteAdminOffer(mockOffer.id, "csrf-token-123");
    expect(deleteRes.success).toBe(true);
  });
});
