import type { CreateOrderInput, OrderPublic } from "@store/shared";

const ordersApiPath = "/api/v1/store/orders";

export class OrderApiError extends Error {
  public constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message || code);
    this.name = "OrderApiError";
  }
}

export async function placeOrder(
  input: CreateOrderInput,
  idempotencyKey: string = crypto.randomUUID(),
  csrfToken?: string,
): Promise<{ data: OrderPublic; guestReceiptToken?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
  };
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  let response: Response;
  try {
    response = await fetch(ordersApiPath, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new OrderApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "UNKNOWN_ERROR";
    const details =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "details" in body.error
        ? formatOrderErrorDetails(body.error.details)
        : undefined;
    throw new OrderApiError(code, response.status, details);
  }

  const result = body as { data: OrderPublic; guestReceiptToken?: string };
  if (result.guestReceiptToken && typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(`guest_receipt_${result.data.id}`, result.guestReceiptToken);
    } catch {
      // Graceful fallback
    }
  }

  return result;
}

function formatOrderErrorDetails(details: unknown): string | undefined {
  if (typeof details === "string") return details;
  if (!details || typeof details !== "object") return undefined;

  const flattened = details as { fieldErrors?: unknown; formErrors?: unknown };
  const fieldErrors = flattened.fieldErrors && typeof flattened.fieldErrors === "object"
    ? Object.values(flattened.fieldErrors).flatMap((value) => Array.isArray(value) ? value : [])
    : [];
  const formErrors = Array.isArray(flattened.formErrors) ? flattened.formErrors : [];
  const messages = [...fieldErrors, ...formErrors].filter((value): value is string => typeof value === "string");
  return messages.length > 0 ? messages.join(" ") : undefined;
}

export async function getOrder(
  id: string,
  guestReceiptTokenOverride?: string,
): Promise<{ data: OrderPublic }> {
  const token =
    guestReceiptTokenOverride ??
    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(`guest_receipt_${id}`) : null);

  const headers: Record<string, string> = {};
  if (token) {
    headers["X-Guest-Receipt-Token"] = token;
  }

  let response: Response;
  try {
    response = await fetch(`${ordersApiPath}/${encodeURIComponent(id)}`, {
      method: "GET",
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new OrderApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ORDER_NOT_FOUND";
    throw new OrderApiError(code, response.status);
  }

  return body as { data: OrderPublic };
}

export async function listCustomerOrders(): Promise<{ data: OrderPublic[] }> {
  let response: Response;
  try {
    response = await fetch(ordersApiPath, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new OrderApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new OrderApiError(code, response.status);
  }

  return body as { data: OrderPublic[] };
}
