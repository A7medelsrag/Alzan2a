import type { ShippingRate } from "../../api/operations";

export interface ShippingRateDraft {
  governorate: string;
  priceInput: string;
  minDaysInput: string;
  maxDaysInput: string;
  isEnabled: boolean;
}

export interface ShippingRowValidation {
  priceError?: string;
  minDaysError?: string;
  maxDaysError?: string;
  isValid: boolean;
}

export type ShippingUpdatePayload = Omit<ShippingRate, "governorate">;

export interface ShippingStatsSummary {
  totalGovernorates: number;
  enabledCount: number;
  disabledCount: number;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  avgMinDays: number | null;
  avgMaxDays: number | null;
}

export function centsToInputString(priceCents: number): string {
  const safe = Math.max(0, Math.round(priceCents));
  const whole = Math.floor(safe / 100);
  const rem = safe % 100;
  if (rem === 0) return String(whole);
  if (rem % 10 === 0) return `${whole}.${rem / 10}`;
  return `${whole}.${String(rem).padStart(2, "0")}`;
}

export function toShippingDraft(rate: ShippingRate): ShippingRateDraft {
  return {
    governorate: rate.governorate,
    priceInput: centsToInputString(rate.priceCents),
    minDaysInput: String(rate.minDeliveryDays),
    maxDaysInput: String(rate.maxDeliveryDays),
    isEnabled: rate.isEnabled,
  };
}

export function validateShippingDraft(draft: ShippingRateDraft): ShippingRowValidation {
  let priceError: string | undefined;
  let minDaysError: string | undefined;
  let maxDaysError: string | undefined;

  const priceTrimmed = draft.priceInput.trim();
  if (!priceTrimmed) {
    priceError = "يرجى إدخال سعر الشحن.";
  } else if (!/^-?\d+(?:\.\d+)?$/.test(priceTrimmed)) {
    priceError = "أدخل سعراً رقمياً صالحاً.";
  } else {
    const parsedPrice = Number(priceTrimmed);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      priceError = "يجب أن يكون السعر 0 جنيه أو أكثر.";
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(priceTrimmed)) {
      priceError = "يُسمح بحد أقصى خانتين عشريتين.";
    } else {
      const [wholePart = "0", fracPart = ""] = priceTrimmed.split(".");
      const cents = Number(wholePart) * 100 + Number(fracPart.padEnd(2, "0"));
      if (!Number.isSafeInteger(cents)) {
        priceError = "القيمة المدخلة كبيرة جداً.";
      }
    }
  }

  let minVal: number | null = null;
  const minTrimmed = draft.minDaysInput.trim();
  if (!minTrimmed) {
    minDaysError = "يرجى إدخال أقل مدة.";
  } else if (!/^-?\d+$/.test(minTrimmed)) {
    minDaysError = "أقل مدة يجب أن تكون عدداً صحيحاً.";
  } else {
    const parsedMin = Number(minTrimmed);
    if (!Number.isSafeInteger(parsedMin) || parsedMin < 1) {
      minDaysError = "أقل مدة يجب أن تكون 1 يوم على الأقل.";
    } else {
      minVal = parsedMin;
    }
  }

  let maxVal: number | null = null;
  const maxTrimmed = draft.maxDaysInput.trim();
  if (!maxTrimmed) {
    maxDaysError = "يرجى إدخال أقصى مدة.";
  } else if (!/^-?\d+$/.test(maxTrimmed)) {
    maxDaysError = "أقصى مدة يجب أن تكون عدداً صحيحاً.";
  } else {
    const parsedMax = Number(maxTrimmed);
    if (!Number.isSafeInteger(parsedMax) || parsedMax < 1) {
      maxDaysError = "أقصى مدة يجب أن تكون 1 يوم على الأقل.";
    } else {
      maxVal = parsedMax;
    }
  }

  if (minVal !== null && maxVal !== null && minVal > maxVal) {
    maxDaysError = `أقصى مدة يجب ألا تقل عن أقل مدة (${minVal}).`;
  }

  return {
    priceError,
    minDaysError,
    maxDaysError,
    isValid: !priceError && !minDaysError && !maxDaysError,
  };
}

export function parseShippingDraftPayload(
  draft: ShippingRateDraft,
): ShippingUpdatePayload | null {
  const validation = validateShippingDraft(draft);
  if (!validation.isValid) return null;

  const [wholePart = "0", fracPart = ""] = draft.priceInput.trim().split(".");
  const priceCents = Number(wholePart) * 100 + Number(fracPart.padEnd(2, "0"));

  return {
    priceCents,
    minDeliveryDays: Number(draft.minDaysInput.trim()),
    maxDeliveryDays: Number(draft.maxDaysInput.trim()),
    isEnabled: draft.isEnabled,
  };
}

export function isShippingDraftDirty(
  draft: ShippingRateDraft,
  saved: ShippingRate,
): boolean {
  const payload = parseShippingDraftPayload(draft);
  if (!payload) {
    return (
      draft.priceInput !== centsToInputString(saved.priceCents) ||
      draft.minDaysInput !== String(saved.minDeliveryDays) ||
      draft.maxDaysInput !== String(saved.maxDeliveryDays) ||
      draft.isEnabled !== saved.isEnabled
    );
  }

  return (
    payload.priceCents !== saved.priceCents ||
    payload.minDeliveryDays !== saved.minDeliveryDays ||
    payload.maxDeliveryDays !== saved.maxDeliveryDays ||
    payload.isEnabled !== saved.isEnabled
  );
}

export function formatShippingPriceEgp(priceCents: number): string {
  const safe = Math.max(0, Math.round(priceCents));
  const whole = Math.floor(safe / 100);
  const rem = safe % 100;
  if (rem === 0) return `${whole.toLocaleString("en-US")} جنيه`;
  const formatted = (safe / 100).toFixed(2);
  return `${formatted} جنيه`;
}

export function formatAverageDays(avgMin: number | null, avgMax: number | null): string {
  if (avgMin === null || avgMax === null) return "—";
  const fmt = (val: number) => (Number.isInteger(val) ? String(val) : val.toFixed(1));
  if (fmt(avgMin) === fmt(avgMax)) return `${fmt(avgMin)} يوم`;
  return `${fmt(avgMin)} - ${fmt(avgMax)} يوم`;
}

export function computeShippingStats(drafts: ShippingRateDraft[]): ShippingStatsSummary {
  const totalGovernorates = drafts.length;
  const enabledCount = drafts.filter((d) => d.isEnabled).length;
  const disabledCount = totalGovernorates - enabledCount;

  const parsedEntries = drafts
    .map((draft) => ({
      draft,
      payload: parseShippingDraftPayload(draft),
    }))
    .filter(
      (entry): entry is { draft: ShippingRateDraft; payload: ShippingUpdatePayload } =>
        entry.payload !== null,
    );

  const enabledPayloads = parsedEntries
    .filter((entry) => entry.payload.isEnabled)
    .map((entry) => entry.payload);

  const metricsSource =
    enabledPayloads.length > 0
      ? enabledPayloads
      : parsedEntries.map((entry) => entry.payload);

  if (metricsSource.length === 0) {
    return {
      totalGovernorates,
      enabledCount,
      disabledCount,
      minPriceCents: null,
      maxPriceCents: null,
      avgMinDays: null,
      avgMaxDays: null,
    };
  }

  let minPriceCents = metricsSource[0]!.priceCents;
  let maxPriceCents = metricsSource[0]!.priceCents;
  let totalMinDays = 0;
  let totalMaxDays = 0;

  for (const item of metricsSource) {
    if (item.priceCents < minPriceCents) minPriceCents = item.priceCents;
    if (item.priceCents > maxPriceCents) maxPriceCents = item.priceCents;
    totalMinDays += item.minDeliveryDays;
    totalMaxDays += item.maxDeliveryDays;
  }

  return {
    totalGovernorates,
    enabledCount,
    disabledCount,
    minPriceCents,
    maxPriceCents,
    avgMinDays: Number((totalMinDays / metricsSource.length).toFixed(1)),
    avgMaxDays: Number((totalMaxDays / metricsSource.length).toFixed(1)),
  };
}

export function formatShippingApiError(error: unknown, governorate?: string): string {
  const prefix = governorate ? `تعذر حفظ إعدادات ${governorate}: ` : "";
  if (error instanceof Error) {
    switch (error.message) {
      case "ADMIN_UNAUTHENTICATED":
        return `${prefix}انتهت جلسة الإدارة. يرجى تسجيل الدخول مرة أخرى.`;
      case "ADMIN_FORBIDDEN":
        return `${prefix}ليست لديك صلاحية تعديل إعدادات الشحن.`;
      case "CSRF_TOKEN_MISSING":
        return `${prefix}تعذر التحقق من رمز الأمان. يرجى تحديث الصفحة والمحاولة مرة أخرى.`;
      case "SHIPPING_DAYS_INVALID":
        return `${prefix}أقصى مدة توصيل يجب أن تكون مساوية أو أكبر من أقل مدة.`;
      case "VALIDATION_ERROR":
        return `${prefix}القيم المدخلة غير صالحة. يرجى مراجعة السعر ومدة التوصيل.`;
      default:
        return governorate
          ? `تعذر حفظ إعدادات ${governorate} (${error.message}).`
          : `تعذر تحميل بيانات الشحن (${error.message}).`;
    }
  }
  return governorate
    ? `لم يتم حفظ إعدادات ${governorate}. تحقق من الاتصال وحاول مرة أخرى.`
    : "تعذر تحميل أسعار الشحن. تحقق من اتصال الخادم وصلاحيتك.";
}
