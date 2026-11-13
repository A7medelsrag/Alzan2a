import type {
  AdminCreateCouponInput,
  AdminUpdateCouponInput,
  CouponPublic,
} from "@store/shared";

const adminCouponsApiPath = "/api/v1/admin/coupons";

export class AdminCouponApiError extends Error {
  public constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message || code);
    this.name = "AdminCouponApiError";
  }
}

export async function listAdminCoupons(): Promise<{ data: CouponPublic[] }> {
  let response: Response;
  try {
    response = await fetch(adminCouponsApiPath, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new AdminCouponApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new AdminCouponApiError(code, response.status);
  }

  return body as { data: CouponPublic[] };
}

export async function createAdminCoupon(
  input: AdminCreateCouponInput,
  csrfToken: string,
): Promise<{ data: CouponPublic }> {
  let response: Response;
  try {
    response = await fetch(adminCouponsApiPath, {
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
    throw new AdminCouponApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
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
    throw new AdminCouponApiError(code, response.status, message);
  }

  return body as { data: CouponPublic };
}

export async function updateAdminCoupon(
  id: string,
  input: AdminUpdateCouponInput,
  csrfToken: string,
): Promise<{ data: CouponPublic }> {
  let response: Response;
  try {
    response = await fetch(`${adminCouponsApiPath}/${encodeURIComponent(id)}`, {
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
    throw new AdminCouponApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new AdminCouponApiError(code, response.status);
  }

  return body as { data: CouponPublic };
}

export async function deleteAdminCoupon(
  id: string,
  csrfToken: string,
): Promise<{ success: true }> {
  let response: Response;
  try {
    response = await fetch(`${adminCouponsApiPath}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new AdminCouponApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new AdminCouponApiError(code, response.status);
  }

  return body as { success: true };
}
