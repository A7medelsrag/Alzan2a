import { useState } from "react";
import { resolvePublicImageUrl } from "../../../utils/media";
import { BANNER_SLOT_LABELS, formatAdDate, getBannerStatus, type BannerDraft } from "./adHelpers";

interface AdPreviewModalProps {
  banner: BannerDraft;
  onClose: () => void;
  onEdit?: () => void;
}

export default function AdPreviewModal({ banner, onClose, onEdit }: AdPreviewModalProps) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const status = getBannerStatus({
    isEnabled: banner.isEnabled,
    startsAt: banner.startsAt ?? null,
    endsAt: banner.endsAt ?? null,
  });

  const activeImageUrl =
    viewport === "mobile"
      ? banner.mobileImageUrl || banner.desktopImageUrl
      : banner.desktopImageUrl || banner.mobileImageUrl;

  const opacityRatio = Math.max(0, Math.min(80, banner.overlayOpacity)) / 100;
  const blurPx = Math.max(0, Math.min(20, banner.blur));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-5 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-preview-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="ad-preview-modal-title" className="text-base font-bold text-[#101B30]">
              معاينة الإعلان
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {BANNER_SLOT_LABELS[banner.slot]} · ترتيب الظهور #{banner.sortOrder}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Switcher */}
            <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  viewport === "desktop"
                    ? "bg-[#101B30] text-white shadow-2xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                سطح المكتب
              </button>
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  viewport === "mobile"
                    ? "bg-[#101B30] text-white shadow-2xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                الهاتف
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق المعاينة"
              className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Preview Stage */}
        <div className="flex-1 overflow-y-auto bg-neutral-100 p-4 sm:p-6">
          <div
            className={`mx-auto overflow-hidden rounded-2xl border border-neutral-200 bg-[#101B30] shadow-lg transition-all ${
              viewport === "mobile" ? "max-w-[360px] aspect-[4/5]" : "w-full aspect-[16/7] min-h-[240px]"
            } relative flex items-center justify-center`}
          >
            {activeImageUrl ? (
              <img
                src={resolvePublicImageUrl(activeImageUrl)}
                alt={banner.title || "معاينة الإعلان"}
                style={{ filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined }}
                className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: banner.overlayColor || "#101B30" }}
              />
            )}

            {/* Overlay */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: banner.overlayColor || "#101B30",
                opacity: activeImageUrl ? opacityRatio : 1,
              }}
            />

            {/* Content */}
            <div className="relative z-10 mx-auto max-w-xl px-6 py-8 text-center text-white">
              {banner.subtitle && (
                <p className="mb-2 inline-block rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-[#D6A33A] backdrop-blur-xs">
                  {banner.subtitle}
                </p>
              )}
              {banner.title && (
                <h3 className="text-xl font-black leading-snug sm:text-3xl">
                  {banner.title}
                </h3>
              )}
              {!banner.title && !banner.subtitle && (
                <span className="rounded-lg bg-black/40 px-3 py-1 text-xs text-white/80">
                  إعلان بصورة فقط
                </span>
              )}
              {banner.buttonLabel && (
                <div className="mt-5">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-[#C8102E] px-5 py-2.5 text-xs font-bold text-white shadow-md sm:text-sm">
                    {banner.buttonLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Strip */}
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-xs sm:grid-cols-3">
            <div>
              <span className="block text-neutral-400">الحالة</span>
              <strong className="mt-0.5 block font-bold text-neutral-800">
                {status === "active"
                  ? "نشط"
                  : status === "scheduled"
                    ? "مجدول"
                    : status === "expired"
                      ? "منتهي"
                      : "غير نشط"}
              </strong>
            </div>
            <div className="min-w-0">
              <span className="block text-neutral-400">رابط الوجهة</span>
              <strong dir="ltr" className="mt-0.5 block truncate text-right font-mono text-neutral-800">
                {banner.linkUrl || "غير محدد"}
              </strong>
            </div>
            <div>
              <span className="block text-neutral-400">فترة العرض</span>
              <strong className="mt-0.5 block text-neutral-800">
                {banner.startsAt || banner.endsAt
                  ? `${formatAdDate(banner.startsAt)} — ${formatAdDate(banner.endsAt)}`
                  : "مفتوح بدون تاريخ محدد"}
              </strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-3.5">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-800 transition-colors hover:bg-neutral-100"
            >
              تعديل الإعلان
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#101B30] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1a2b4c]"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
