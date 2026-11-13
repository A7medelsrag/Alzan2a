import { describe, expect, it } from "vitest";
import {
  addLocalWishlistItem,
  isItemInWishlist,
  removeLocalWishlistItem,
  type UnifiedWishlistItem,
  type WishlistProductSnippet,
} from "./WishlistContext";

describe("Wishlist pure helper functions", () => {
  const sampleProduct: WishlistProductSnippet = {
    id: "prod-1",
    name: "فستان ستان",
    slug: "satin-dress",
    priceCents: 12000,
  };

  it("adds item to empty wishlist", () => {
    const list: UnifiedWishlistItem[] = [];
    const updated = addLocalWishlistItem(list, sampleProduct);
    expect(updated).toHaveLength(1);
    expect(updated[0].productId).toBe("prod-1");
    expect(updated[0].name).toBe("فستان ستان");
  });

  it("does not add duplicate product", () => {
    const list: UnifiedWishlistItem[] = [
      {
        id: "guest_prod-1",
        productId: "prod-1",
        name: "فستان ستان",
        slug: "satin-dress",
        priceCents: 12000,
      },
    ];
    const updated = addLocalWishlistItem(list, sampleProduct);
    expect(updated).toHaveLength(1);
  });

  it("detects if product is in wishlist", () => {
    const list: UnifiedWishlistItem[] = [
      {
        id: "guest_prod-1",
        productId: "prod-1",
        name: "فستان ستان",
        slug: "satin-dress",
        priceCents: 12000,
      },
    ];
    expect(isItemInWishlist(list, "prod-1")).toBe(true);
    expect(isItemInWishlist(list, "prod-2")).toBe(false);
  });

  it("removes item from wishlist by productId or id", () => {
    const list: UnifiedWishlistItem[] = [
      {
        id: "item_xyz",
        productId: "prod-1",
        name: "فستان ستان",
        slug: "satin-dress",
        priceCents: 12000,
      },
      {
        id: "item_abc",
        productId: "prod-2",
        name: "حذاء كلاسيك",
        slug: "classic-shoes",
        priceCents: 9500,
      },
    ];

    const afterRemoveByProduct = removeLocalWishlistItem(list, "prod-1");
    expect(afterRemoveByProduct).toHaveLength(1);
    expect(afterRemoveByProduct[0].productId).toBe("prod-2");

    const afterRemoveById = removeLocalWishlistItem(list, "item_abc");
    expect(afterRemoveById).toHaveLength(1);
    expect(afterRemoveById[0].productId).toBe("prod-1");
  });
});
