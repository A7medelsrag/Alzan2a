import { adminSessionResponseSchema } from "@store/shared";

const adminAuthPath = "/api/v1/admin/auth";
const requestTimeoutMs = 8_000;

export type AdminAuthErrorKind = "invalid" | "rateLimit" | "origin" | "unavailable";

export class AdminAuthError extends Error {
  public constructor(public readonly kind: AdminAuthErrorKind) {
    super(kind);
    this.name = "AdminAuthError";
  }
}

async function sendRequest(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init?.signal;
  const abortOnExternalSignal = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  else externalSignal?.addEventListener("abort", abortOnExternalSignal, { once: true });
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetch(`${adminAuthPath}${path}`, {
      ...init,
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    });
  } catch (error) {
    if (externalSignal?.aborted) throw error;
    if (controller.signal.aborted) throw new AdminAuthError("unavailable");
    if (error instanceof TypeError) throw new AdminAuthError("unavailable");
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortOnExternalSignal);
  }
}

export async function getAdminSession(signal?: AbortSignal) {
  const response = await sendRequest("/me", { method: "GET", signal });
  if (response.status === 401) return null;
  if (!response.ok) throw new AdminAuthError("unavailable");
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AdminAuthError("unavailable");
  }
  const parsed = adminSessionResponseSchema.safeParse(body);
  if (!parsed.success) throw new AdminAuthError("unavailable");
  return parsed.data;
}

export async function verifyAdminSession(signal?: AbortSignal): Promise<boolean> {
  return (await getAdminSession(signal)) !== null;
}

export async function loginAdmin(username: string, password: string, mfaCode?: string): Promise<void> {
  const credentials = {
    username,
    password,
    ...(mfaCode?.trim() ? { mfaCode: mfaCode.trim() } : {}),
  };
  const response = await sendRequest("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (response.status === 401) throw new AdminAuthError("invalid");
  if (response.status === 429) throw new AdminAuthError("rateLimit");
  if (response.status === 403) throw new AdminAuthError("origin");
  if (!response.ok) throw new AdminAuthError("unavailable");
  if (!(await verifyAdminSession())) throw new AdminAuthError("invalid");
}

export async function logoutAdmin(csrfToken: string): Promise<void> {
  const response = await sendRequest("/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
  if (response.status === 429) throw new AdminAuthError("rateLimit");
  if (!response.ok) throw new AdminAuthError("unavailable");
}
