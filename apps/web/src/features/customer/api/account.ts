import {
  customerAddressInputSchema,
  customerAddressListResponseSchema,
  customerProfileUpdateSchema,
  customerSessionResponseSchema,
  customerAddressSchema,
  customerPublicSchema,
  type CustomerAddress as CustomerAddressData,
  type CustomerAddressInput,
  type CustomerPublic,
} from "@store/shared";

const customerApiPath = "/api/v1/store/customer";

export type Customer = CustomerPublic;
export type CustomerAddress = CustomerAddressData;

export type CustomerAuthErrorKind =
  | "credentials"
  | "phoneTaken"
  | "rateLimit"
  | "unauthenticated"
  | "unavailable"
  | "googleAuthFailed"
  | "googleEmailUnverified";

export class CustomerAuthError extends Error {
  public constructor(public readonly kind: CustomerAuthErrorKind) {
    super(kind);
    this.name = "CustomerAuthError";
  }
}

async function request(path: string, init?: RequestInit, csrfToken?: string): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);

  try {
    return await fetch(`${customerApiPath}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof TypeError) throw new CustomerAuthError("unavailable");
    throw error;
  }
}

async function parseSession(response: Response) {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CustomerAuthError("unavailable");
  }
  const parsed = customerSessionResponseSchema.safeParse(body);
  if (!parsed.success) throw new CustomerAuthError("unavailable");
  return parsed.data;
}

function mapRequestError(status: number, body: unknown): CustomerAuthError {
  const code = body && typeof body === "object" && "error" in body &&
    body.error && typeof body.error === "object" && "code" in body.error
    ? body.error.code
    : undefined;
  if (status === 401 && code === "GOOGLE_AUTH_FAILED") return new CustomerAuthError("googleAuthFailed");
  if (status === 403 && code === "GOOGLE_EMAIL_UNVERIFIED") return new CustomerAuthError("googleEmailUnverified");
  if (status === 401 && code === "CUSTOMER_CREDENTIALS_INVALID") return new CustomerAuthError("credentials");
  if (status === 409 && code === "CUSTOMER_PHONE_ALREADY_REGISTERED") return new CustomerAuthError("phoneTaken");
  if (status === 429) return new CustomerAuthError("rateLimit");
  if (status === 401) return new CustomerAuthError("unauthenticated");
  return new CustomerAuthError("unavailable");
}

async function throwRequestError(response: Response): Promise<never> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  throw mapRequestError(response.status, body);
}

export async function registerCustomer(input: {
  fullName: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
}) {
  const response = await request("/register", { method: "POST", body: JSON.stringify(input) });
  if (!response.ok) return throwRequestError(response);
  return parseSession(response);
}

export async function loginCustomer(input: { phone: string; password: string }) {
  const response = await request("/login", { method: "POST", body: JSON.stringify(input) });
  if (!response.ok) return throwRequestError(response);
  return parseSession(response);
}

export async function loginWithGoogle(credential: string) {
  const response = await request("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  if (!response.ok) return throwRequestError(response);
  return parseSession(response);
}

export async function getCurrentCustomer(): Promise<Awaited<ReturnType<typeof parseSession>> | null> {
  const response = await request("/me");
  if (response.status === 401) return null;
  if (!response.ok) return throwRequestError(response);
  return parseSession(response);
}

export async function logoutCustomer(csrfToken: string): Promise<void> {
  const response = await request("/logout", { method: "POST" }, csrfToken);
  if (!response.ok) return throwRequestError(response);
}

export async function updateCustomerProfile(fullName: string, csrfToken: string): Promise<Customer> {
  const input = customerProfileUpdateSchema.parse({ fullName });
  const response = await request("/profile", { method: "PATCH", body: JSON.stringify(input) }, csrfToken);
  if (!response.ok) return throwRequestError(response);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("data" in body)) throw new CustomerAuthError("unavailable");
  const session = customerPublicSchema.safeParse(body.data);
  if (!session.success) throw new CustomerAuthError("unavailable");
  return session.data;
}

export async function listCustomerAddresses(): Promise<CustomerAddress[]> {
  const response = await request("/addresses");
  if (!response.ok) return throwRequestError(response);
  const body: unknown = await response.json();
  const parsed = customerAddressListResponseSchema.safeParse(body);
  if (!parsed.success) throw new CustomerAuthError("unavailable");
  return parsed.data.data;
}

export async function createCustomerAddress(input: CustomerAddressInput, csrfToken: string): Promise<CustomerAddress> {
  const parsedInput = customerAddressInputSchema.parse(input);
  const response = await request("/addresses", { method: "POST", body: JSON.stringify(parsedInput) }, csrfToken);
  if (!response.ok) return throwRequestError(response);
  const body: unknown = await response.json();
  const parsed = customerAddressSchema.safeParse(body && typeof body === "object" && "data" in body ? body.data : null);
  if (!parsed.success) throw new CustomerAuthError("unavailable");
  return parsed.data;
}

export async function updateCustomerAddress(
  id: string,
  input: CustomerAddressInput,
  csrfToken: string,
): Promise<CustomerAddress> {
  const parsedInput = customerAddressInputSchema.parse(input);
  const response = await request(`/addresses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(parsedInput),
  }, csrfToken);
  if (!response.ok) return throwRequestError(response);
  const body: unknown = await response.json();
  const parsed = customerAddressSchema.safeParse(body && typeof body === "object" && "data" in body ? body.data : null);
  if (!parsed.success) throw new CustomerAuthError("unavailable");
  return parsed.data;
}

export async function deleteCustomerAddress(id: string, csrfToken: string): Promise<void> {
  const response = await request(`/addresses/${encodeURIComponent(id)}`, { method: "DELETE" }, csrfToken);
  if (!response.ok) return throwRequestError(response);
}
