const adminBasePath = "/api/v1/admin";

export class AdminApiError extends Error {
  public constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message || code);
    this.name = "AdminApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (method !== "GET" && method !== "HEAD") {
      const sessionResponse = await fetch("/api/v1/admin/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!sessionResponse.ok) throw new AdminApiError("ADMIN_UNAUTHENTICATED", 401);
      const session = (await sessionResponse.json()) as { csrfToken?: string };
      if (!session.csrfToken) throw new AdminApiError("CSRF_TOKEN_MISSING", 403);
      headers.set("X-CSRF-Token", session.csrfToken);
    }
    response = await fetch(`${adminBasePath}${path}`, {
      credentials: "include",
      cache: "no-store",
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof AdminApiError) throw error;
    throw new AdminApiError("UNAVAILABLE", 503, "تعذر الاتصال بالخادم.");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = body as { error?: { code?: string; message?: string } } | null;
    throw new AdminApiError(
      errorBody?.error?.code || "API_ERROR",
      response.status,
      errorBody?.error?.message || "حدث خطأ أثناء معالجة الطلب.",
    );
  }

  return body as T;
}

// ----------------- Overview Types -----------------
export interface AdminOverviewStats {
  totalOrders: number;
  todayOrders: number;
  deliveredOrderCount: number;
  todayDeliveredOrders: number;
  totalSalesCents: number | null;
  todaySalesCents: number | null;
  totalCustomers: number;
  totalProducts: number;
  lowStockVariants: number;
  pendingReviews: number;
  recentOrders: Array<{
    id: string;
    customerName: string;
    customerPhone: string;
    status: string;
    totalCents: number;
    createdAt: string;
    items: Array<{
      quantity: number;
      variant?: { name: string; product?: { name: string } };
    }>;
  }>;
}

export async function fetchAdminOverview(): Promise<{ data: AdminOverviewStats }> {
  return request<{ data: AdminOverviewStats }>("/overview");
}

// ----------------- Product Types -----------------
export interface AdminProductVariant {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  stockQuantity: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  category: { id: string; name: string; slug: string };
  variants: AdminProductVariant[];
  totalStock: number;
  priceCents: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchAdminProducts(query?: {
  search?: string;
  categoryId?: string;
  status?: string;
}): Promise<{ data: AdminProduct[] }> {
  const params = new URLSearchParams();
  if (query?.search?.trim()) params.set("search", query.search.trim());
  if (query?.categoryId) params.set("categoryId", query.categoryId);
  if (query?.status) params.set("status", query.status);
  const q = params.toString() ? `?${params.toString()}` : "";
  return request<{ data: AdminProduct[] }>(`/products${q}`);
}

export async function createAdminProduct(input: {
  name: string;
  slug?: string;
  description: string;
  categoryId: string;
  imageUrl?: string | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  variants?: Array<{ name: string; priceCents: number; stockQuantity: number; sku?: string }>;
}): Promise<{ data: AdminProduct }> {
  return request<{ data: AdminProduct }>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAdminProduct(
  id: string,
  input: {
    name?: string;
    description?: string;
    categoryId?: string;
    imageUrl?: string | null;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  },
): Promise<{ data: AdminProduct }> {
  return request<{ data: AdminProduct }>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateAdminVariantStock(
  variantId: string,
  stockQuantity: number,
  reason: string,
): Promise<{ data: AdminProductVariant }> {
  return request<{ data: AdminProductVariant }>(`/variants/${variantId}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ stockQuantity, reason }),
  });
}

// ----------------- Category Types -----------------
export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  parentId?: string | null;
  productCount: number;
}

export async function fetchAdminCategories(): Promise<{ data: AdminCategory[] }> {
  return request<{ data: AdminCategory[] }>("/categories");
}

export async function createAdminCategory(input: {
  name: string;
  slug?: string;
  parentId?: string | null;
  imageUrl?: string | null;
}): Promise<{ data: AdminCategory }> {
  return request<{ data: AdminCategory }>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAdminCategory(
  id: string,
  input: {
    name?: string;
    slug?: string;
    parentId?: string | null;
    imageUrl?: string | null;
  },
): Promise<{ data: AdminCategory }> {
  return request<{ data: AdminCategory }>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteAdminCategory(id: string): Promise<{ data: { success: boolean } }> {
  return request<{ data: { success: boolean } }>(`/categories/${id}`, {
    method: "DELETE",
  });
}

// ----------------- Customer Types -----------------
export interface AdminCustomer {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  ordersCount: number;
  totalSpentCents: number;
  createdAt: string;
}

export async function fetchAdminCustomers(): Promise<{ data: AdminCustomer[] }> {
  return request<{ data: AdminCustomer[] }>("/customers");
}

// ----------------- Review Types -----------------
export interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  customerName: string;
  customerPhone?: string | null;
  rating: number;
  comment?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export async function fetchAdminReviews(status?: string): Promise<{ data: AdminReview[] }> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<{ data: AdminReview[] }>(`/reviews${q}`);
}

export async function updateAdminReviewStatus(
  id: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
): Promise<{ data: AdminReview }> {
  return request<{ data: AdminReview }>(`/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
