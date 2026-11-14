export type PromotionStatus =
  | "active"
  | "scheduled"
  | "expired"
  | "inactive"
  | "exhausted";

export interface LifecycleInput {
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  usageCount?: number;
}

export function getPromotionStatus(
  item: LifecycleInput,
  now: Date = new Date(),
): PromotionStatus {
  if (!item.isActive) return "inactive";

  const nowMs = now.getTime();
  if (item.startsAt) {
    const startMs = new Date(item.startsAt).getTime();
    if (!Number.isNaN(startMs) && startMs > nowMs) {
      return "scheduled";
    }
  }

  if (item.endsAt) {
    const endMs = new Date(item.endsAt).getTime();
    if (!Number.isNaN(endMs) && endMs < nowMs) {
      return "expired";
    }
  }

  if (
    item.usageLimit !== null &&
    item.usageLimit !== undefined &&
    item.usageCount !== undefined &&
    item.usageCount >= item.usageLimit
  ) {
    return "exhausted";
  }

  return "active";
}

export function formatArabicDate(iso: string | null | undefined): string {
  if (!iso) return "غير محدد";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatArabicShortDate(iso: string | null | undefined): string {
  if (!iso) return "غير محدد";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
