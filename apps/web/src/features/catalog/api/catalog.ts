import {
  categoryListResponseSchema,
  productDetailResponseSchema,
  productListResponseSchema,
  type CategoryListResponse,
  type StoreProduct,
} from "@store/shared";

export class CatalogRequestError extends Error {
  public constructor() {
    super("Catalog request failed");
    this.name = "CatalogRequestError";
  }
}

export async function listCategories(signal?: AbortSignal): Promise<CategoryListResponse["data"]> {
  let response: Response;
  try {
    response = await fetch("/api/v1/store/categories", { cache: "no-store", signal });
  } catch {
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
    throw new CatalogRequestError();
  }

  if (!response.ok) throw new CatalogRequestError();

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CatalogRequestError();
  }

  const parsed = categoryListResponseSchema.safeParse(body);
  if (!parsed.success) throw new CatalogRequestError();
  return parsed.data.data;
}

export async function listCatalogProducts(
  options: {
    search?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  } = {},
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    page: (options.page ?? 1).toString(),
    pageSize: (options.pageSize ?? 24).toString(),
  });

  if (options.category && options.category !== "all") {
    query.set("category", options.category);
  }
  if (options.search?.trim()) {
    query.set("search", options.search.trim());
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1/store/products?${query.toString()}`, {
      cache: "no-store",
      signal,
    });
  } catch {
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
    throw new CatalogRequestError();
  }

  if (!response.ok) throw new CatalogRequestError();

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CatalogRequestError();
  }

  const parsed = productListResponseSchema.safeParse(body);
  if (!parsed.success) throw new CatalogRequestError();
  return parsed.data;
}

export async function listWomensClothing(
  search: string,
  signal?: AbortSignal,
  category = "women-clothing",
) {
  return listCatalogProducts({ search, category }, signal);
}

export async function getCatalogProductBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<StoreProduct> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/store/products/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      signal,
    });
  } catch {
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
    throw new CatalogRequestError();
  }

  if (!response.ok) throw new CatalogRequestError();

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CatalogRequestError();
  }

  const parsed = productDetailResponseSchema.safeParse(body);
  if (!parsed.success) throw new CatalogRequestError();
  return parsed.data.data;
}
