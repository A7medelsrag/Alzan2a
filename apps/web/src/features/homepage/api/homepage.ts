import {
  adminHomepageResponseSchema,
  homepageBannerInputSchema,
  homepageResponseSchema,
  homepageSectionInputSchema,
  type AdminHomepageResponse,
  type HomepageBannerInput,
  type HomepageResponse,
  type HomepageSectionInput,
} from "@store/shared";

export type HomepageContent = HomepageResponse["data"];
export type HomepageAdminContent = AdminHomepageResponse["data"];

export class HomepageRequestError extends Error {
  public constructor(public readonly kind: "unavailable" | "unauthorized" | "invalid" | "setupRequired") {
    super(kind);
    this.name = "HomepageRequestError";
  }
}

export async function loadHomepage(signal?: AbortSignal): Promise<HomepageContent> {
  const homepage = await requestJson("/api/v1/store/homepage", homepageResponseSchema, signal);
  return homepage.data;
}

export async function loadAdminHomepage(signal?: AbortSignal): Promise<HomepageAdminContent> {
  const response = await requestJson("/api/v1/admin/homepage", adminHomepageResponseSchema, signal);
  return response.data;
}

export async function saveHomepageSection(
  input: HomepageSectionInput,
  csrfToken: string,
  id?: string,
): Promise<void> {
  const parsed = homepageSectionInputSchema.safeParse(input);
  if (!parsed.success) throw new HomepageRequestError("invalid");
  await sendAdminRequest(id ? `/sections/${id}` : "/sections", id ? "PUT" : "POST", csrfToken, parsed.data);
}

export async function deleteHomepageSection(id: string, csrfToken: string): Promise<void> {
  await sendAdminRequest(`/sections/${id}`, "DELETE", csrfToken);
}

export async function reorderHomepageSections(ids: string[], csrfToken: string): Promise<void> {
  await sendAdminRequest("/sections/order", "PUT", csrfToken, { ids });
}

export async function saveHomepageBanner(
  input: HomepageBannerInput,
  csrfToken: string,
  id?: string,
): Promise<void> {
  const parsed = homepageBannerInputSchema.safeParse(input);
  if (!parsed.success) throw new HomepageRequestError("invalid");
  await sendAdminRequest(id ? `/banners/${id}` : "/banners", id ? "PUT" : "POST", csrfToken, parsed.data);
}

export async function deleteHomepageBanner(id: string, csrfToken: string): Promise<void> {
  await sendAdminRequest(`/banners/${id}`, "DELETE", csrfToken);
}

export async function saveProductImage(id: string, imageUrl: string | null, csrfToken: string): Promise<void> {
  await sendAdminRequest(`/products/${id}/image`, "PUT", csrfToken, { imageUrl });
}

export async function saveCategoryImages(
  id: string,
  imageUrl: string | null,
  bannerImageUrl: string | null,
  csrfToken: string,
): Promise<void> {
  await sendAdminRequest(`/categories/${id}/images`, "PUT", csrfToken, { imageUrl, bannerImageUrl });
}

async function requestJson<T>(
  path: string,
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { cache: "no-store", credentials: "include", signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new HomepageRequestError("unavailable");
  }
  if (!response.ok) throw await responseError(response);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new HomepageRequestError("unavailable");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HomepageRequestError("unavailable");
  return parsed.data;
}

async function sendAdminRequest(
  path: string,
  method: string,
  csrfToken: string,
  body?: unknown,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin/homepage${path}`, {
      method,
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new HomepageRequestError("unavailable");
  }
  if (!response.ok) throw await responseError(response);
}

async function responseError(response: Response): Promise<HomepageRequestError> {
  if (response.status === 401 || response.status === 403) return new HomepageRequestError("unauthorized");
  if (response.status === 503) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return new HomepageRequestError("unavailable");
    }
    if (
      typeof body === "object" && body !== null &&
      "error" in body && typeof body.error === "object" && body.error !== null &&
      "code" in body.error && body.error.code === "HOMEPAGE_SETUP_REQUIRED"
    ) {
      return new HomepageRequestError("setupRequired");
    }
  }
  return new HomepageRequestError("unavailable");
}
