import type { WishlistItemInput, WishlistItemPublic, WishlistSyncInput } from "@store/shared";

const wishlistApiPath = "/api/v1/store/wishlist";

export class WishlistApiError extends Error {
  public constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message || code);
    this.name = "WishlistApiError";
  }
}

export async function fetchServerWishlist(): Promise<{ data: WishlistItemPublic[] }> {
  let response: Response;
  try {
    response = await fetch(wishlistApiPath, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new WishlistApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  if (response.status === 401) {
    return { data: [] };
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new WishlistApiError(code, response.status);
  }

  return body as { data: WishlistItemPublic[] };
}

export async function addToServerWishlist(
  input: WishlistItemInput,
  csrfToken: string,
): Promise<{ data: WishlistItemPublic[] }> {
  let response: Response;
  try {
    response = await fetch(wishlistApiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(input),
    });
  } catch {
    throw new WishlistApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new WishlistApiError(code, response.status);
  }

  return body as { data: WishlistItemPublic[] };
}

export async function removeFromServerWishlist(
  idOrProductId: string,
  csrfToken: string,
): Promise<{ data: WishlistItemPublic[] }> {
  let response: Response;
  try {
    response = await fetch(`${wishlistApiPath}/${encodeURIComponent(idOrProductId)}`, {
      method: "DELETE",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new WishlistApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new WishlistApiError(code, response.status);
  }

  return body as { data: WishlistItemPublic[] };
}

export async function syncServerWishlist(
  input: WishlistSyncInput,
  csrfToken: string,
): Promise<{ data: WishlistItemPublic[] }> {
  let response: Response;
  try {
    response = await fetch(`${wishlistApiPath}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(input),
    });
  } catch {
    throw new WishlistApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new WishlistApiError(code, response.status);
  }

  return body as { data: WishlistItemPublic[] };
}
