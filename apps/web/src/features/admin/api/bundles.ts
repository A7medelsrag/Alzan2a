import type {
  AdminCreateBundleInput,
  AdminUpdateBundleInput,
  BundlePublic,
} from "@store/shared";

const adminBundlesApiPath = "/api/v1/admin/bundles";

export class AdminBundleApiError extends Error {
  public constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message || code);
    this.name = "AdminBundleApiError";
  }
}

export async function listAdminBundles(): Promise<{ data: BundlePublic[] }> {
  let response: Response;
  try {
    response = await fetch(adminBundlesApiPath, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new AdminBundleApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new AdminBundleApiError(code, response.status);
  }

  return body as { data: BundlePublic[] };
}

export async function createAdminBundle(
  input: AdminCreateBundleInput,
  csrfToken: string,
): Promise<{ data: BundlePublic }> {
  let response: Response;
  try {
    response = await fetch(adminBundlesApiPath, {
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
    throw new AdminBundleApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
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
    throw new AdminBundleApiError(code, response.status, message);
  }

  return body as { data: BundlePublic };
}

export async function updateAdminBundle(
  id: string,
  input: AdminUpdateBundleInput,
  csrfToken: string,
): Promise<{ data: BundlePublic }> {
  let response: Response;
  try {
    response = await fetch(`${adminBundlesApiPath}/${encodeURIComponent(id)}`, {
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
    throw new AdminBundleApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
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
    throw new AdminBundleApiError(code, response.status, message);
  }

  return body as { data: BundlePublic };
}

export async function deleteAdminBundle(
  id: string,
  csrfToken: string,
): Promise<{ success: boolean }> {
  let response: Response;
  try {
    response = await fetch(`${adminBundlesApiPath}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new AdminBundleApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const code =
      body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "code" in body.error
        ? (body.error.code as string)
        : "ERROR";
    throw new AdminBundleApiError(code, response.status);
  }

  return { success: true };
}
