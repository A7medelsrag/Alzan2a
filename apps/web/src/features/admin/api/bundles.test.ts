import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createAdminBundle,
  deleteAdminBundle,
  listAdminBundles,
  updateAdminBundle,
} from "./bundles.js";

const mockBundle = {
  id: "44444444-4444-4444-8444-444444444444",
  internalName: "suit-pack",
  publicTitle: "طقم كلاسيك متكامل",
  description: "وصف الطقم",
  imageUrl: null,
  fixedPriceCents: 45000,
  discountCents: null,
  isFreeShipping: true,
  startsAt: null,
  endsAt: null,
  isActive: true,
  displayOrder: 0,
  items: [],
  createdAt: "2026-11-07T10:00:00Z",
  updatedAt: "2026-11-07T10:00:00Z",
};

describe("Admin Bundles API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists bundles successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [mockBundle] }),
      }),
    );

    const result = await listAdminBundles();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].publicTitle).toBe("طقم كلاسيك متكامل");
  });

  it("creates a bundle successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ data: mockBundle }),
      }),
    );

    const result = await createAdminBundle(
      {
        internalName: "suit-pack",
        publicTitle: "طقم كلاسيك متكامل",
        fixedPriceCents: 45000,
        isFreeShipping: true,
        items: [{ productId: "p-1", quantity: 1 }],
      },
      "csrf-token-123",
    );

    expect(result.data.publicTitle).toBe("طقم كلاسيك متكامل");
  });

  it("updates and deletes bundles successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { ...mockBundle, isActive: false } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        }),
    );

    const updateRes = await updateAdminBundle(mockBundle.id, { isActive: false }, "csrf-token-123");
    expect(updateRes.data.isActive).toBe(false);

    const deleteRes = await deleteAdminBundle(mockBundle.id, "csrf-token-123");
    expect(deleteRes.success).toBe(true);
  });
});
