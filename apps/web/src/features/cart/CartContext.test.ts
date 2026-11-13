import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addItemToCart,
  computeCartTotals,
  loadSavedCart,
  removeItemFromCart,
  updateItemQuantity,
  type CartItem,
} from "./CartContext";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.get(key) ?? null; }
  setItem(key: string, val: string) { this.store.set(key, val); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

const sampleItem: Omit<CartItem, "quantity"> = {
  variantId: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
  productId: "prod-1",
  productName: "فستان نسائي كاجوال",
  variantName: "مقاس M",
  priceCents: 15000,
};

describe("Cart state and pure operations", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds new items to an empty cart", () => {
    const items = addItemToCart([], sampleItem, 1);
    expect(items).toHaveLength(1);
    expect(items[0]?.variantId).toBe(sampleItem.variantId);
    expect(items[0]?.quantity).toBe(1);

    const totals = computeCartTotals(items);
    expect(totals.itemCount).toBe(1);
    expect(totals.subtotalCents).toBe(15000);
  });

  it("increments quantity when existing item is added again, capping at 20", () => {
    let items = addItemToCart([], sampleItem, 2);
    items = addItemToCart(items, sampleItem, 3);
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(5);

    // Enforces max 20 limit
    items = addItemToCart(items, sampleItem, 20);
    expect(items[0]?.quantity).toBe(20);

    const totals = computeCartTotals(items);
    expect(totals.itemCount).toBe(20);
    expect(totals.subtotalCents).toBe(300000);
  });

  it("updates item quantity and removes item when quantity reaches 0", () => {
    let items = addItemToCart([], sampleItem, 3);
    items = updateItemQuantity(items, sampleItem.variantId, 5);
    expect(items[0]?.quantity).toBe(5);

    items = updateItemQuantity(items, sampleItem.variantId, 0);
    expect(items).toHaveLength(0);
  });

  it("removes items by variant ID", () => {
    let items = addItemToCart([], sampleItem, 2);
    items = removeItemFromCart(items, sampleItem.variantId);
    expect(items).toHaveLength(0);
    expect(computeCartTotals(items).itemCount).toBe(0);
  });

  it("loads and validates persisted items from localStorage", () => {
    localStorage.setItem(
      "zan2a_cart_v1",
      JSON.stringify([{ ...sampleItem, quantity: 2 }]),
    );

    const loaded = loadSavedCart();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.variantId).toBe(sampleItem.variantId);
    expect(loaded[0]?.quantity).toBe(2);
  });
});
