import type { AdminUpdateOrderStatusInput, OrderPublic, OrderStatus } from "@store/shared";

const adminOrdersApiPath = "/api/v1/admin/orders";

export class AdminOrderApiError extends Error {
  public constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message || code);
    this.name = "AdminOrderApiError";
  }
}

export interface AdminOrderListResponse {
  data: OrderPublic[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export async function listAdminOrders(params?: {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}): Promise<AdminOrderListResponse> {
  const queryParts: string[] = [];
  if (params?.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
  if (params?.page) queryParts.push(`page=${encodeURIComponent(params.page)}`);
  if (params?.limit) queryParts.push(`limit=${encodeURIComponent(params.limit)}`);
  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  const requestPath = `${adminOrdersApiPath}${queryString}`;

  let response: Response;
  try {
    response = await fetch(requestPath, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new AdminOrderApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new AdminOrderApiError(code, response.status);
  }

  return body as AdminOrderListResponse;
}

export async function getAdminOrder(id: string): Promise<{ data: OrderPublic }> {
  let response: Response;
  try {
    response = await fetch(`${adminOrdersApiPath}/${encodeURIComponent(id)}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new AdminOrderApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ORDER_NOT_FOUND";
    throw new AdminOrderApiError(code, response.status);
  }

  return body as { data: OrderPublic };
}

export async function updateAdminOrderStatus(
  id: string,
  input: AdminUpdateOrderStatusInput,
  csrfToken: string,
): Promise<{ data: OrderPublic }> {
  let response: Response;
  try {
    response = await fetch(`${adminOrdersApiPath}/${encodeURIComponent(id)}`, {
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
    throw new AdminOrderApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new AdminOrderApiError(code, response.status);
  }

  return body as { data: OrderPublic };
}
