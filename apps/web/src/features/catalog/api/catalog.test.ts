import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogRequestError, listCatalogProducts, listCategories, listWomensClothing } from "./catalog";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("catalog requests", () => {
  it("sends the search term with the women's clothing category", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [],
      page: 1,
      pageSize: 24,
      total: 0,
    })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listWomensClothing("  dress  ")).resolves.toMatchObject({ data: [], total: 0 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/store/products?page=1&pageSize=24&category=women-clothing&search=dress",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("lists all categories", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{
        id: "cat-1",
        name: "ملابس نسائية",
        slug: "women-clothing",
        parentId: null,
        imageUrl: null,
        bannerImageUrl: null,
      }],
    })));
    vi.stubGlobal("fetch", fetchMock);

    const categories = await listCategories();
    expect(categories).toHaveLength(1);
    expect(categories[0].slug).toBe("women-clothing");
    expect(categories[0].parentId).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/store/categories",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("lists products without category when category is 'all'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [],
      page: 1,
      pageSize: 24,
      total: 0,
    })));
    vi.stubGlobal("fetch", fetchMock);

    await listCatalogProducts({ category: "all" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/store/products?page=1&pageSize=24",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("surfaces API and malformed response failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(listWomensClothing("dress")).rejects.toBeInstanceOf(CatalogRequestError);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: "invalid" }))));
    await expect(listWomensClothing("dress")).rejects.toBeInstanceOf(CatalogRequestError);
  });
});
