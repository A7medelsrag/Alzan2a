import { add, subtract } from "@store/shared";
import { AdminApiError } from "../../api/management";
import type {
  CreatePurchasePayload,
  CreateSupplierPayload,
  PurchaseInvoice,
  PurchasePaymentMethod,
  RecordPurchasePaymentPayload,
  Supplier,
} from "../../api/operations";

export type PurchaseStatusFilter =
  | "ALL"
  | "DRAFT"
  | "CONFIRMED"
  | "CONFIRMED_UNPAID"
  | "CONFIRMED_PARTIAL"
  | "CONFIRMED_PAID";

export type PurchaseSortOption =
  | "date_desc"
  | "date_asc"
  | "total_desc"
  | "total_asc"
  | "remaining_desc";

export type PurchasePageSize = 10 | 25 | 50 | "ALL";

export type PurchaseFiltersState = {
  search: string;
  status: PurchaseStatusFilter;
  supplierId: string;
  dateFrom: string;
  dateTo: string;
  sortBy: PurchaseSortOption;
};

export type PurchaseStatsSummary = {
  totalPurchasesCents: number;
  totalOutstandingCents: number;
  totalPaidCents: number;
  totalInvoicesCount: number;
  confirmedCount: number;
  draftCount: number;
  paidInvoicesCount: number;
  unpaidOrPartialCount: number;
  totalSuppliersCount: number;
};

export type ProductVariantOption = {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  stockQuantity: number;
  priceCents: number;
  label: string;
};

export type PurchaseLineDraft = {
  key: string;
  variantId: string;
  quantityInput: string;
  unitCostInput: string;
};

export type InvoicePaymentState = "draft" | "paid" | "partial" | "unpaid";

/**
 * Parses an EGP decimal string (e.g. "125.5", "100", "0.75") into integer piasters
 * without floating-point rounding drift.
 */
export function parseEgpToPiasters(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return null;
  const [poundsPart, fractionPart = ""] = trimmed.split(".");
  const pounds = Number.parseInt(poundsPart, 10);
  const fraction = Number.parseInt(fractionPart.padEnd(2, "0"), 10);
  if (!Number.isSafeInteger(pounds) || !Number.isSafeInteger(fraction)) return null;
  const total = pounds * 100 + fraction;
  return Number.isSafeInteger(total) ? total : null;
}

export function formatPiastersToInput(piasters: number): string {
  if (!Number.isInteger(piasters) || piasters < 0) return "0";
  const pounds = Math.floor(piasters / 100);
  const cents = piasters % 100;
  if (cents === 0) return String(pounds);
  if (cents % 10 === 0) return `${pounds}.${Math.floor(cents / 10)}`;
  return `${pounds}.${String(cents).padStart(2, "0")}`;
}

export function parsePositiveQuantity(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const qty = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(qty) && qty >= 1 ? qty : null;
}

export function computeLineTotalCents(quantity: number | null, unitCostCents: number | null): number {
  if (quantity === null || unitCostCents === null || quantity < 1 || unitCostCents < 0) {
    return 0;
  }
  return quantity * unitCostCents;
}

export function getInvoiceRemainingCents(invoice: Pick<PurchaseInvoice, "totalCents" | "paidCents">): number {
  const diff = subtract(invoice.totalCents, invoice.paidCents);
  return diff > 0 ? diff : 0;
}

export function getInvoicePaymentState(
  invoice: Pick<PurchaseInvoice, "status" | "totalCents" | "paidCents">,
): InvoicePaymentState {
  if (invoice.status === "DRAFT") return "draft";
  if (invoice.totalCents === 0 || invoice.paidCents >= invoice.totalCents) return "paid";
  if (invoice.paidCents > 0) return "partial";
  return "unpaid";
}

export function getInvoiceDisplayNumber(invoice: Pick<PurchaseInvoice, "id" | "invoiceNumber">): string {
  return invoice.invoiceNumber?.trim() || `#${invoice.id.slice(0, 8)}`;
}

export function getInvoiceItemsSummary(invoice: PurchaseInvoice): {
  itemsCount: number;
  unitsCount: number;
  previewText: string;
} {
  const itemsCount = invoice.lines.length;
  const unitsCount = invoice.lines.reduce((sum, line) => sum + line.quantity, 0);
  const previewText = invoice.lines
    .slice(0, 2)
    .map((line) => `${line.variant.product.name} (${line.variant.name}) × ${line.quantity}`)
    .join("، ");
  return { itemsCount, unitsCount, previewText };
}

/**
 * Computes real purchasing statistics strictly from loaded backend records.
 * Unconfirmed drafts do not count toward confirmed purchases total or payable balance.
 */
export function computePurchaseStats(
  invoices: PurchaseInvoice[],
  suppliers: Supplier[],
): PurchaseStatsSummary {
  let totalPurchasesCents = 0;
  let totalOutstandingCents = 0;
  let totalPaidCents = 0;
  let confirmedCount = 0;
  let draftCount = 0;
  let paidInvoicesCount = 0;
  let unpaidOrPartialCount = 0;

  for (const invoice of invoices) {
    if (invoice.status === "DRAFT") {
      draftCount += 1;
      continue;
    }
    confirmedCount += 1;
    totalPurchasesCents = add(totalPurchasesCents, invoice.totalCents);
    totalPaidCents = add(totalPaidCents, invoice.paidCents);
    const remaining = getInvoiceRemainingCents(invoice);
    totalOutstandingCents = add(totalOutstandingCents, remaining);
    if (remaining === 0) {
      paidInvoicesCount += 1;
    } else {
      unpaidOrPartialCount += 1;
    }
  }

  return {
    totalPurchasesCents,
    totalOutstandingCents,
    totalPaidCents,
    totalInvoicesCount: invoices.length,
    confirmedCount,
    draftCount,
    paidInvoicesCount,
    unpaidOrPartialCount,
    totalSuppliersCount: suppliers.length,
  };
}

function getInvoiceTimestamp(invoice: PurchaseInvoice): number {
  const raw = invoice.invoiceDate ?? invoice.createdAt ?? "";
  const time = Date.parse(raw);
  return Number.isNaN(time) ? 0 : time;
}

export function filterAndSortInvoices(
  invoices: PurchaseInvoice[],
  filters: PurchaseFiltersState,
): PurchaseInvoice[] {
  const query = filters.search.trim().toLowerCase();
  const fromTime = filters.dateFrom ? Date.parse(`${filters.dateFrom}T00:00:00.000Z`) : null;
  const toTime = filters.dateTo ? Date.parse(`${filters.dateTo}T23:59:59.999Z`) : null;

  const filtered = invoices.filter((invoice) => {
    if (filters.supplierId && filters.supplierId !== "ALL" && invoice.supplier.id !== filters.supplierId) {
      return false;
    }

    const paymentState = getInvoicePaymentState(invoice);
    if (filters.status === "DRAFT" && invoice.status !== "DRAFT") return false;
    if (filters.status === "CONFIRMED" && invoice.status !== "CONFIRMED") return false;
    if (filters.status === "CONFIRMED_UNPAID" && paymentState !== "unpaid") return false;
    if (filters.status === "CONFIRMED_PARTIAL" && paymentState !== "partial") return false;
    if (filters.status === "CONFIRMED_PAID" && paymentState !== "paid") return false;

    if (fromTime !== null || toTime !== null) {
      const invoiceTs = getInvoiceTimestamp(invoice);
      if (!invoiceTs) return false;
      if (fromTime !== null && invoiceTs < fromTime) return false;
      if (toTime !== null && invoiceTs > toTime) return false;
    }

    if (query) {
      const displayNum = getInvoiceDisplayNumber(invoice).toLowerCase();
      const rawId = invoice.id.toLowerCase();
      const supplierName = invoice.supplier.name.toLowerCase();
      const supplierPhone = (invoice.supplier.phone ?? "").toLowerCase();
      const notes = (invoice.notes ?? "").toLowerCase();
      const matchesLine = invoice.lines.some(
        (line) =>
          line.variant.product.name.toLowerCase().includes(query) ||
          line.variant.name.toLowerCase().includes(query) ||
          (line.variant.sku ?? "").toLowerCase().includes(query),
      );

      if (
        !displayNum.includes(query) &&
        !rawId.includes(query) &&
        !supplierName.includes(query) &&
        !supplierPhone.includes(query) &&
        !notes.includes(query) &&
        !matchesLine
      ) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case "date_asc":
        return getInvoiceTimestamp(a) - getInvoiceTimestamp(b);
      case "total_desc":
        return b.totalCents - a.totalCents;
      case "total_asc":
        return a.totalCents - b.totalCents;
      case "remaining_desc":
        return getInvoiceRemainingCents(b) - getInvoiceRemainingCents(a);
      case "date_desc":
      default:
        return getInvoiceTimestamp(b) - getInvoiceTimestamp(a);
    }
  });
}

export function formatPurchaseDate(iso?: string | null, withTime = false): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(parsed);
}

export function toDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateInputToIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  return new Date(`${trimmed}T12:00:00.000Z`).toISOString();
}

const paymentMethodLabels: Record<PurchasePaymentMethod, string> = {
  CASH: "نقدي (كاش)",
  BANK_TRANSFER: "تحويل بنكي",
  CHECK: "شيك",
  OTHER: "وسيلة أخرى",
};

export function formatPaymentMethodLabel(method: PurchasePaymentMethod): string {
  return paymentMethodLabels[method] ?? method;
}

export function validateSupplierDraft(draft: {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
}): { ok: true; payload: CreateSupplierPayload } | { ok: false; fieldErrors: Record<string, string>; message: string } {
  const fieldErrors: Record<string, string> = {};
  const name = draft.name.trim();
  const contactName = draft.contactName.trim();
  const phone = draft.phone.trim();
  const email = draft.email.trim();
  const address = draft.address.trim();

  if (name.length < 2) {
    fieldErrors.name = "اسم المورد مطلوب ويجب أن يكون حرفين على الأقل.";
  } else if (name.length > 150) {
    fieldErrors.name = "اسم المورد يجب ألا يتجاوز 150 حرفًا.";
  }

  if (contactName.length > 150) {
    fieldErrors.contactName = "اسم المسؤول يجب ألا يتجاوز 150 حرفًا.";
  }

  if (phone.length > 40) {
    fieldErrors.phone = "رقم الهاتف يجب ألا يتجاوز 40 حرفًا.";
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "صيغة البريد الإلكتروني غير صحيحة.";
  }

  if (address.length > 500) {
    fieldErrors.address = "العنوان يجب ألا يتجاوز 500 حرف.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      message: Object.values(fieldErrors)[0] ?? "تحقق من بيانات المورد.",
    };
  }

  return {
    ok: true,
    payload: {
      name,
      ...(contactName ? { contactName } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(address ? { address } : {}),
    },
  };
}

export function validatePurchaseInvoiceDraft(draft: {
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  extraCostsInput: string;
  notes: string;
  lines: PurchaseLineDraft[];
}): {
  ok: true;
  payload: CreatePurchasePayload;
  subtotalCents: number;
  extraCostsCents: number;
  totalCents: number;
} | {
  ok: false;
  fieldErrors: Record<string, string>;
  message: string;
} {
  const fieldErrors: Record<string, string> = {};

  if (!draft.supplierId) {
    fieldErrors.supplierId = "يرجى اختيار المورد أولاً.";
  }

  const invoiceNumber = draft.invoiceNumber.trim();
  if (invoiceNumber.length > 100) {
    fieldErrors.invoiceNumber = "رقم فاتورة المورد يجب ألا يتجاوز 100 حرف.";
  }

  const extraCostsCents =
    draft.extraCostsInput.trim() === "" ? 0 : parseEgpToPiasters(draft.extraCostsInput);
  if (extraCostsCents === null || extraCostsCents < 0) {
    fieldErrors.extraCosts = "المصاريف الإضافية يجب أن تكون رقمًا صحيحًا أو عشريًا غير سالب (بحد أقصى منزلتان).";
  }

  const notes = draft.notes.trim();
  if (notes.length > 2000) {
    fieldErrors.notes = "الملاحظات يجب ألا تتجاوز 2000 حرف.";
  }

  if (draft.lines.length === 0) {
    fieldErrors.lines = "أضف صنفًا واحدًا على الأقل في الفاتورة.";
  } else if (draft.lines.length > 100) {
    fieldErrors.lines = "الحد الأقصى 100 صنف في الفاتورة الواحدة.";
  }

  const seenVariants = new Set<string>();
  const normalizedLines: Array<{ variantId: string; quantity: number; unitCostCents: number }> = [];
  let subtotalCents = 0;

  draft.lines.forEach((line, index) => {
    if (!line.variantId) {
      fieldErrors[`line_${line.key}_variant`] = `اختر المنتج / المقاس في السطر رقم ${index + 1}.`;
    } else if (seenVariants.has(line.variantId)) {
      fieldErrors[`line_${line.key}_variant`] = `لا يمكن تكرار نفس المقاس أكثر من مرة في السطر رقم ${index + 1}.`;
    } else {
      seenVariants.add(line.variantId);
    }

    const quantity = parsePositiveQuantity(line.quantityInput);
    if (quantity === null) {
      fieldErrors[`line_${line.key}_qty`] = `أدخل كمية صحيحة أكبر من صفر في السطر رقم ${index + 1}.`;
    }

    const unitCostCents =
      line.unitCostInput.trim() === "" ? 0 : parseEgpToPiasters(line.unitCostInput);
    if (unitCostCents === null || unitCostCents < 0) {
      fieldErrors[`line_${line.key}_cost`] = `أدخل تكلفة وحدة صالحة في السطر رقم ${index + 1}.`;
    }

    if (line.variantId && quantity !== null && unitCostCents !== null) {
      normalizedLines.push({ variantId: line.variantId, quantity, unitCostCents });
      subtotalCents = add(subtotalCents, quantity * unitCostCents);
    }
  });

  if (Object.keys(fieldErrors).length > 0 || extraCostsCents === null) {
    return {
      ok: false,
      fieldErrors,
      message: Object.values(fieldErrors)[0] ?? "يرجى مراجعة الحقول المطلوبة.",
    };
  }

  const isoDate = dateInputToIso(draft.invoiceDate);

  return {
    ok: true,
    payload: {
      supplierId: draft.supplierId,
      ...(invoiceNumber ? { invoiceNumber } : {}),
      ...(isoDate ? { invoiceDate: isoDate } : {}),
      extraCostsCents,
      ...(notes ? { notes } : {}),
      lines: normalizedLines,
    },
    subtotalCents,
    extraCostsCents,
    totalCents: add(subtotalCents, extraCostsCents),
  };
}

export function validatePaymentDraft(
  draft: {
    amountInput: string;
    method: PurchasePaymentMethod;
    paidAt: string;
    reference: string;
  },
  remainingCents: number,
): { ok: true; payload: RecordPurchasePaymentPayload } | { ok: false; message: string } {
  const amountCents = parseEgpToPiasters(draft.amountInput);
  if (amountCents === null || amountCents <= 0) {
    return { ok: false, message: "أدخل مبلغ دفعة صالحًا أكبر من صفر (جنيه مصري)." };
  }
  if (amountCents > remainingCents) {
    return { ok: false, message: "مبلغ الدفعة يتجاوز المبلغ المتبقي على الفاتورة." };
  }
  const reference = draft.reference.trim();
  if (reference.length > 150) {
    return { ok: false, message: "رقم المرجع يجب ألا يتجاوز 150 حرفًا." };
  }
  const paidAt = dateInputToIso(draft.paidAt);

  return {
    ok: true,
    payload: {
      amountCents,
      method: draft.method,
      ...(paidAt ? { paidAt } : {}),
      ...(reference ? { reference } : {}),
    },
  };
}

const errorMessages: Record<string, string> = {
  PURCHASE_DUPLICATE_VARIANT: "لا يمكن تكرار نفس المنتج/المقاس أكثر من مرة في نفس الفاتورة.",
  PURCHASE_NOT_FOUND: "فاتورة الشراء غير موجودة أو تم تحديثها.",
  PURCHASE_ALREADY_CONFIRMED: "تم اعتماد هذه الفاتورة وإضافتها للمخزون مسبقًا.",
  VARIANT_NOT_FOUND: "أحد المنتجات أو المقاسات المختارة غير موجود.",
  PURCHASE_NOT_PAYABLE: "لا يمكن تسجيل دفعة إلا بعد اعتماد الفاتورة.",
  PAYMENT_EXCEEDS_BALANCE: "مبلغ الدفعة يتجاوز الرصيد المتبقي على الفاتورة.",
  VALIDATION_ERROR: "تحقق من صحة البيانات المدخلة (قد يكون رقم الفاتورة مكررًا أو الحقول غير مكتملة).",
  ADMIN_FORBIDDEN: "ليس لديك صلاحية تنفيذ هذا الإجراء.",
  ADMIN_UNAUTHENTICATED: "انتهت جلسة الإدارة. يرجى تسجيل الدخول مرة أخرى.",
  CSRF_TOKEN_MISSING: "تعذر التحقق من رمز الأمان (CSRF). أعد تحميل الصفحة.",
  ORIGIN_NOT_ALLOWED: "عنوان المتصفح غير مسموح به من الخادم.",
  UNAVAILABLE: "تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مرة أخرى.",
};

export function formatPurchaseApiError(error: unknown, fallback = "تعذر تنفيذ العملية."): string {
  if (error instanceof AdminApiError) {
    return errorMessages[error.code] ?? (error.message && error.message !== error.code ? error.message : fallback);
  }
  if (error instanceof Error && error.message) {
    return errorMessages[error.message] ?? error.message;
  }
  return fallback;
}
