import { AdminApiError } from "./management";

export type Supplier = {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PurchasePaymentMethod = "CASH" | "BANK_TRANSFER" | "CHECK" | "OTHER";

export type PurchasePayment = {
  id: string;
  invoiceId?: string;
  amountCents: number;
  method: PurchasePaymentMethod;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
  createdAt?: string;
};

export type PurchaseLine = {
  id: string;
  invoiceId?: string;
  variantId?: string;
  quantity: number;
  unitCostCents?: number;
  allocatedExtraCostCents?: number;
  lineTotalCents?: number;
  variant: {
    id?: string;
    sku?: string;
    name: string;
    priceCents?: number;
    costCents?: number | null;
    stockQuantity?: number;
    product: { name: string };
  };
};

export type PurchaseInvoice = {
  id: string;
  invoiceNumber: string | null;
  supplierId?: string;
  status: "DRAFT" | "CONFIRMED";
  invoiceDate?: string;
  subtotalCents?: number;
  extraCostsCents?: number;
  totalCents: number;
  paidCents: number;
  notes?: string | null;
  confirmedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  supplier: Supplier;
  lines: PurchaseLine[];
  payments?: PurchasePayment[];
};

export type PurchasesResponse = { data: { suppliers: Supplier[]; invoices: PurchaseInvoice[] } };

export type CreateSupplierPayload = {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type CreatePurchasePayload = {
  supplierId: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  extraCostsCents: number;
  notes?: string;
  lines: Array<{
    variantId: string;
    quantity: number;
    unitCostCents: number;
  }>;
};

export type RecordPurchasePaymentPayload = {
  amountCents: number;
  method: PurchasePaymentMethod;
  paidAt?: string;
  reference?: string;
};
export type ShippingRate = {
  governorate: string;
  priceCents: number;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  isEnabled: boolean;
};
export type FinanceOrder = {
  id: string;
  customerName: string;
  courierName: string | null;
  totalCents: number;
  deliveredAt: string | null;
};
export type FinanceExpense = {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  occurredAt: string;
  platform: string | null;
};
export type FinanceReport = {
  revenueCents: number;
  cogsCents: number;
  unknownCostLines: number;
  expenses: FinanceExpense[];
  expensesCents: number;
  awaitingSettlement: FinanceOrder[];
};
export type StoreSettings = {
  id: string;
  storeName: string;
  dashboardName: string;
  buttonColor: string;
  backgroundColor: string;
  supportPhone: string | null;
  supportWhatsApp: string | null;
  freeShippingThresholdCents: number;
  allowCouponsWithOffers: boolean;
  dailyOrderLimitPerPhone: number | null;
};
export type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  actor: { username: string; role: string } | null;
};
export type StaffRecord = {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
export type ProvisioningResult = { provisioning?: { otpauthUrl: string; recoveryCodes: string[] } };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (method !== "GET") {
    const session = await fetch("/api/v1/admin/auth/me", {
      credentials: "include",
      cache: "no-store",
    });
    if (!session.ok) throw new AdminApiError("ADMIN_UNAUTHENTICATED", 401);
    const value = (await session.json()) as { csrfToken?: string };
    if (!value.csrfToken) throw new AdminApiError("CSRF_TOKEN_MISSING", 403);
    headers.set("X-CSRF-Token", value.csrfToken);
  }
  const response = await fetch(`/api/v1/admin${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new AdminApiError(
      data?.error?.code ?? "API_ERROR",
      response.status,
      data?.error?.message
    );
  return data as T;
}

export const operationsApi = {
  purchases: () => request<PurchasesResponse>("/purchases"),
  createSupplier: (body: CreateSupplierPayload) =>
    request<{ data: Supplier }>("/purchases/suppliers", { method: "POST", body: JSON.stringify(body) }),
  createPurchase: (body: CreatePurchasePayload) =>
    request<{ data: PurchaseInvoice }>("/purchases", { method: "POST", body: JSON.stringify(body) }),
  confirmPurchase: (id: string) =>
    request<{ data: PurchaseInvoice }>(`/purchases/${id}/confirm`, { method: "POST", body: "{}" }),
  payPurchase: (id: string, body: RecordPurchasePaymentPayload) =>
    request<{ data: PurchasePayment }>(`/purchases/${id}/payments`, { method: "POST", body: JSON.stringify(body) }),
  shipping: () => request<{ data: ShippingRate[] }>("/shipping"),
  updateShipping: (name: string, body: unknown) =>
    request(`/shipping/${encodeURIComponent(name)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  finance: (from?: string, to?: string) =>
    request<{ data: FinanceReport }>(
      `/finance?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`
    ),
  addExpense: (body: unknown) =>
    request("/finance/expenses", { method: "POST", body: JSON.stringify(body) }),
  settle: (body: unknown) =>
    request("/finance/settlements", { method: "POST", body: JSON.stringify(body) }),
  settings: () => request<{ data: StoreSettings; audit: AuditEntry[] }>("/settings"),
  updateSettings: (body: unknown) =>
    request("/settings", { method: "PATCH", body: JSON.stringify(body) }),
  staff: () => request<{ data: StaffRecord[] }>("/staff"),
  createStaff: (body: unknown) =>
    request<ProvisioningResult>("/staff", { method: "POST", body: JSON.stringify(body) }),
  updateStaff: (id: string, body: unknown) =>
    request(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  resetMfa: (id: string) =>
    request<ProvisioningResult>(`/staff/${id}/reset-mfa`, { method: "POST", body: "{}" }),
};

export function showProvisioning(value: {
  provisioning?: { otpauthUrl: string; recoveryCodes: string[] };
}) {
  if (value.provisioning)
    window.alert(
      `رابط تهيئة MFA: ${value.provisioning.otpauthUrl}\n\nرموز الاسترداد (تظهر مرة واحدة):\n${value.provisioning.recoveryCodes.join("\n")}`
    );
}
