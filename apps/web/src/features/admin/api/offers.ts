import type {
  AdminCreateProductOfferInput,
  AdminUpdateProductOfferInput,
  ProductOfferPublic,
} from "@store/shared";

const adminOffersApiPath = "/api/v1/admin/offers";

export class AdminOfferApiError extends Error {
  public constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message || code);
    this.name = "AdminOfferApiError";
  }
}

export async function listAdminOffers(): Promise<{ data: ProductOfferPublic[] }> {
  let response: Response;
  try {
    response = await fetch(adminOffersApiPath, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new AdminOfferApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new AdminOfferApiError(code, response.status);
  }

  return body as { data: ProductOfferPublic[] };
}

export async function createAdminOffer(
  input: AdminCreateProductOfferInput,
  csrfToken: string,
): Promise<{ data: ProductOfferPublic }> {
  let response: Response;
  try {
    response = await fetch(adminOffersApiPath, {
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
    throw new AdminOfferApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    const message =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "message" in body.error
        ? (body.error.message as string)
        : undefined;
    throw new AdminOfferApiError(code, response.status, message);
  }

  return body as { data: ProductOfferPublic };
}

export async function updateAdminOffer(
  id: string,
  input: AdminUpdateProductOfferInput,
  csrfToken: string,
): Promise<{ data: ProductOfferPublic }> {
  let response: Response;
  try {
    response = await fetch(`${adminOffersApiPath}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(input),
    });
  } catch {
    throw new AdminOfferApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    const message =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "message" in body.error
        ? (body.error.message as string)
        : undefined;
    throw new AdminOfferApiError(code, response.status, message);
  }

  return body as { data: ProductOfferPublic };
}

export async function deleteAdminOffer(
  id: string,
  csrfToken: string,
): Promise<{ success: boolean }> {
  let response: Response;
  try {
    response = await fetch(`${adminOffersApiPath}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new AdminOfferApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new AdminOfferApiError(code, response.status);
  }

  return { success: true };
}
