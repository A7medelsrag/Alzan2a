import { describe, expect, it, vi } from "vitest";
import { WishlistService } from "./wishlist.service.js";
import type { WishlistRepository } from "../repositories/wishlist.repository.js";

describe("WishlistService", () => {
  const mockRepo: WishlistRepository = {
    listByCustomerId: vi.fn().mockResolvedValue([
      {
        id: "item_1",
        productId: "prod_1",
        variantId: null,
        createdAt: new Date(),
        product: {
          id: "prod_1",
          name: "Test Dress",
          slug: "test-dress",
          description: "A dress",
          imageUrl: null,
          minPriceCents: 15000,
        },
        variant: null,
      },
    ]),
    addItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    syncItems: vi.fn().mockResolvedValue([
      {
        id: "item_1",
        productId: "prod_1",
        variantId: null,
        createdAt: new Date(),
        product: {
          id: "prod_1",
          name: "Test Dress",
          slug: "test-dress",
          description: "A dress",
          imageUrl: null,
          minPriceCents: 15000,
        },
        variant: null,
      },
    ]),
  } as unknown as WishlistRepository;

  const service = new WishlistService(mockRepo);

  it("retrieves customer wishlist", async () => {
    const res = await service.getWishlist("cust_123");
    expect(res.data).toHaveLength(1);
    expect(mockRepo.listByCustomerId).toHaveBeenCalledWith("cust_123");
  });

  it("adds item to customer wishlist", async () => {
    const res = await service.addToWishlist("cust_123", { productId: "prod_1" });
    expect(mockRepo.addItem).toHaveBeenCalledWith("cust_123", "prod_1", undefined);
    expect(res.data).toHaveLength(1);
  });

  it("removes item from customer wishlist", async () => {
    const res = await service.removeFromWishlist("cust_123", "item_1");
    expect(mockRepo.removeItem).toHaveBeenCalledWith("cust_123", "item_1");
    expect(res.data).toHaveLength(1);
  });

  it("synchronizes guest wishlist items idempotently", async () => {
    const res = await service.syncWishlist("cust_123", [{ productId: "prod_1" }]);
    expect(mockRepo.syncItems).toHaveBeenCalledWith("cust_123", [{ productId: "prod_1" }]);
    expect(res.data).toHaveLength(1);
  });
});
