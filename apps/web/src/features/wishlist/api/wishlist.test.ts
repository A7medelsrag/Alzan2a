import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addToServerWishlist,
  fetchServerWishlist,
  removeFromServerWishlist,
  syncServerWishlist,
} from "./wishlist";

describe("wishlist api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches server wishlist", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "item_1" }] }),
    });

    const res = await fetchServerWishlist();
    expect(res.data).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith("/api/v1/store/wishlist", expect.objectContaining({ method: "GET" }));
  });

  it("handles 401 unauthenticated by returning empty array", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: "UNAUTHENTICATED" } }),
    });

    const res = await fetchServerWishlist();
    expect(res.data).toEqual([]);
  });

  it("adds item with CSRF token", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "item_1" }] }),
    });

    const res = await addToServerWishlist(
      { productId: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d" },
      "test-csrf",
    );
    expect(res.data).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/store/wishlist",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-CSRF-Token": "test-csrf" }),
      }),
    );
  });

  it("removes item with CSRF token", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const res = await removeFromServerWishlist("item_1", "test-csrf");
    expect(res.data).toHaveLength(0);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/store/wishlist/item_1",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ "X-CSRF-Token": "test-csrf" }),
      }),
    );
  });

  it("syncs wishlist batch with CSRF token", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: "item_1" }] }),
    });

    const res = await syncServerWishlist(
      { items: [{ productId: "0a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d" }] },
      "test-csrf",
    );
    expect(res.data).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/store/wishlist/sync",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-CSRF-Token": "test-csrf" }),
      }),
    );
  });
});
