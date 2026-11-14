import type { HomepageBannerInput } from "@store/shared";
import type { HomepageAdminContent } from "../../homepage/api/homepage";

export type BannerRecord = HomepageAdminContent["banners"][number];
export type BannerDraft = HomepageBannerInput & { id?: string };
export type BannerSlot = HomepageBannerInput["slot"];
export type BannerComputedStatus = "active" | "scheduled" | "inactive" | "expired";

export const BANNER_SLOTS: { value: BannerSlot; label: string; hint: string }[] = [
  { value: "HERO", label: "البانر الرئيسي", hint: "العرض الرئيسي أعلى الصفحة الرئيسية" },
  { value: "ANNOUNCEMENT", label: "شريط الإعلان", hint: "شريط التنبيه العلوي أعلى المتجر" },
  { value: "SIDE_TOP", label: "البانر الجانبي الأعلى", hint: "البطاقة الترويجية الجانبية العليا" },
  { value: "SIDE_BOTTOM", label: "البانر الجانبي الأسفل", hint: "البطاقة الترويجية الجانبية السفلى" },
  { value: "TIMER", label: "بانر التايمر", hint: "بانر قسم العروض الموقوتة" },
  { value: "FINAL", label: "البانر الأخير", hint: "البانر الختامي أسفل الصفحة الرئيسية" },
  { value: "PROMOTION", label: "بانر ترويجي", hint: "بنرات العروض الترويجية الموسمية" },
];

export const BANNER_SLOT_LABELS: Record<BannerSlot, string> = Object.fromEntries(
  BANNER_SLOTS.map((slot) => [slot.value, slot.label]),
) as Record<BannerSlot, string>;

export function getBannerStatus(banner: Pick<BannerRecord, "isEnabled" | "startsAt" | "endsAt">, now = new Date()): BannerComputedStatus {
  const startsAt = banner.startsAt ? new Date(banner.startsAt) : null;
  const endsAt = banner.endsAt ? new Date(banner.endsAt) : null;

  if (endsAt && !Number.isNaN(endsAt.valueOf()) && endsAt <= now) {
    return "expired";
  }
  if (!banner.isEnabled) {
    return "inactive";
  }
  if (startsAt && !Number.isNaN(startsAt.valueOf()) && startsAt > now) {
    return "scheduled";
  }
  return "active";
}

export function createEmptyBannerDraft(sortOrder: number): BannerDraft {
  return {
    slot: "HERO",
    title: "",
    subtitle: null,
    desktopImageUrl: null,
    mobileImageUrl: null,
    buttonLabel: null,
    linkUrl: null,
    overlayColor: "#101B30",
    overlayOpacity: 35,
    blur: 0,
    isEnabled: true,
    sortOrder,
    startsAt: null,
    endsAt: null,
  };
}

export function bannerToDraft(banner: BannerRecord): BannerDraft {
  return {
    ...banner,
    title: banner.title ?? null,
    subtitle: banner.subtitle ?? null,
    desktopImageUrl: banner.desktopImageUrl ?? null,
    mobileImageUrl: banner.mobileImageUrl ?? null,
    buttonLabel: banner.buttonLabel ?? null,
    linkUrl: banner.linkUrl ?? null,
    startsAt: banner.startsAt ?? null,
    endsAt: banner.endsAt ?? null,
  };
}

export function toBannerPayload(draft: BannerDraft): { id?: string; input: HomepageBannerInput } {
  const { id, ...raw } = draft;
  return {
    ...(id ? { id } : {}),
    input: {
      ...raw,
      title: raw.title?.trim() ? raw.title.trim() : null,
      subtitle: raw.subtitle?.trim() ? raw.subtitle.trim() : null,
      desktopImageUrl: raw.desktopImageUrl?.trim() ? raw.desktopImageUrl.trim() : null,
      mobileImageUrl: raw.mobileImageUrl?.trim() ? raw.mobileImageUrl.trim() : null,
      buttonLabel: raw.buttonLabel?.trim() ? raw.buttonLabel.trim() : null,
      linkUrl: raw.linkUrl?.trim() ? raw.linkUrl.trim() : null,
      startsAt: raw.startsAt || null,
      endsAt: raw.endsAt || null,
    },
  };
}

export function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function fromLocalDateTimeInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

export function formatAdDate(value: string | null | undefined): string {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "غير محدد";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
