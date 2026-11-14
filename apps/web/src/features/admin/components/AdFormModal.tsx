import { useState, type FormEvent } from "react";
import { homepageBannerInputSchema } from "@store/shared";
import AdImageUploadField from "./AdImageUploadField";
import {
  BANNER_SLOTS,
  fromLocalDateTimeInput,
  toBannerPayload,
  toLocalDateTimeInput,
  type BannerDraft,
  type BannerSlot,
} from "./adHelpers";
import { resolvePublicImageUrl } from "../../../utils/media";

interface AdFormModalProps {
  initialDraft: BannerDraft;
  csrfToken: string | null;
  busy: boolean;
  serverError: string;
  onCsrfTokenChange: (token: string) => void;
  onSubmit: (draft: BannerDraft) => Promise<void>;
  onClose: () => void;
}

function mapZodIssueToArabic(path: PropertyKey[], message: string): string {
  const field = path[0];
  if (field === "endsAt" || message.includes("End date")) {
    return "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.";
  }
  if (field === "linkUrl" && message.includes("destination")) {
    return "عند إدخال نص للزر، يجب تحديد رابط الوجهة.";
  }
  if (field === "linkUrl") {
    return "رابط الوجهة غير صالح. استخدم مسارًا داخليًا مثل /catalog أو رابطًا يبدأ بـ https://.";
  }
  if (field === "desktopImageUrl") {
    return "رابط صورة سطح المكتب غير صالح. يجب أن يكون رابط HTTPS صحيحًا.";
  }
  if (field === "mobileImageUrl") {
    return "رابط صورة الهاتف غير صالح. يجب أن يكون رابط HTTPS صحيحًا.";
  }
  if (field === "title" && message.includes("text or an image")) {
    return "يجب إدخال عنوان أو عنوان فرعي أو صورة سطح مكتب واحدة على الأقل.";
  }
  if (field === "overlayOpacity") {
    return "شفافية التراكب يجب أن تكون بين 0 و 80%.";
  }
  if (field === "blur") {
    return "درجة التمويه يجب أن تكون بين 0 و 20.";
  }
  if (field === "sortOrder") {
    return "ترتيب الظهور يجب أن يكون رقمًا صحيحًا بين 0 و 10000.";
  }
  return "يرجى التحقق من صحة البيانات المدخلة قبل الحفظ.";
}

export default function AdFormModal({
  initialDraft,
  csrfToken,
  busy,
  serverError,
  onCsrfTokenChange,
  onSubmit,
  onClose,
}: AdFormModalProps) {
  const [draft, setDraft] = useState<BannerDraft>(initialDraft);
  const [validationError, setValidationError] = useState("");
  const isEditing = Boolean(draft.id);

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");

    const { input } = toBannerPayload(draft);
    const parsed = homepageBannerInputSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setValidationError(
        firstIssue
          ? mapZodIssueToArabic(firstIssue.path, firstIssue.message)
          : "يرجى مراجعة الحقول المدخلة.",
      );
      return;
    }

    await onSubmit(draft);
  }

  const activeError = validationError || serverError;
  const previewBgImage = draft.desktopImageUrl || draft.mobileImageUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-form-modal-title"
      onClick={onClose}
    >
      <form
        onSubmit={(event) => void handleFormSubmit(event)}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
      >
        {/* Sticky Drawer Header */}
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-[#101B30] px-5 py-4 text-white sm:px-6">
          <div className="min-w-0">
            <h2 id="ad-form-modal-title" className="text-base font-bold sm:text-lg">
              {isEditing ? "تعديل الإعلان" : "إضافة إعلان جديد"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-300">
              {isEditing
                ? "حدّث بيانات الإعلان أو صوره أو جدولته الزمنية."
                : "أضف بانرًا إعلانيًا جديدًا وحدد موضع ظهوره في المتجر."}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {activeError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800"
            >
              {activeError}
            </div>
          )}

          {/* Section A: Basic Information */}
          <section className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-4 sm:p-5">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-[#101B30]">
                1. المعلومات الأساسية
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                اختر موضع الإعلان في المتجر وأضف النصوص الرئيسية الظاهرة للعملاء.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0 md:col-span-2">
                <label
                  htmlFor="ad-slot"
                  className="mb-1.5 block text-xs font-bold text-neutral-800"
                >
                  موضع الإعلان *
                </label>
                <select
                  id="ad-slot"
                  disabled={busy}
                  value={draft.slot}
                  onChange={(event) =>
                    setDraft({ ...draft, slot: event.target.value as BannerSlot })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs font-medium text-neutral-900 focus:border-[#C8102E] focus:outline-hidden"
                >
                  {BANNER_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label} — {slot.hint}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="ad-title"
                  className="mb-1.5 block text-xs font-bold text-neutral-800"
                >
                  عنوان الإعلان
                </label>
                <input
                  id="ad-title"
                  type="text"
                  maxLength={120}
                  disabled={busy}
                  value={draft.title ?? ""}
                  placeholder="مثال: خصومات الصيف حتى 40%"
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value || null })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#C8102E] focus:outline-hidden"
                />
                <span className="mt-1 block text-[11px] text-neutral-400">
                  بحد أقصى 120 حرفًا (اختياري إذا كانت الصورة كافية).
                </span>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="ad-subtitle"
                  className="mb-1.5 block text-xs font-bold text-neutral-800"
                >
                  العنوان الفرعي
                </label>
                <input
                  id="ad-subtitle"
                  type="text"
                  maxLength={240}
                  disabled={busy}
                  value={draft.subtitle ?? ""}
                  placeholder="مثال: عرض لفترة محدودة على التشكيلة الجديدة"
                  onChange={(event) =>
                    setDraft({ ...draft, subtitle: event.target.value || null })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#C8102E] focus:outline-hidden"
                />
                <span className="mt-1 block text-[11px] text-neutral-400">
                  نص تعريفي قصير يظهر أعلى أو أسفل العنوان الرئيسي.
                </span>
              </div>
            </div>
          </section>

          {/* Section B: Advertisement Images */}
          <section className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-4 sm:p-5">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-[#101B30]">
                2. صور الإعلان
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                يمكنك رفع صورة مباشرة من الجهاز أو لصق رابط HTTPS. يُفضّل توفير نسخة مخصصة للهاتف.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <AdImageUploadField
                label="صورة سطح المكتب"
                description="تظهر على الشاشات الكبيرة (يفضّل نسبة عرضية 16:9)."
                value={draft.desktopImageUrl ?? ""}
                csrfToken={csrfToken}
                disabled={busy}
                aspect="desktop"
                onCsrfTokenChange={onCsrfTokenChange}
                onChange={(value) =>
                  setDraft({ ...draft, desktopImageUrl: value || null })
                }
              />

              <AdImageUploadField
                label="صورة الهاتف (اختياري)"
                description="تظهر على الهواتف الذكية بدلاً من صورة سطح المكتب."
                value={draft.mobileImageUrl ?? ""}
                csrfToken={csrfToken}
                disabled={busy}
                aspect="mobile"
                onCsrfTokenChange={onCsrfTokenChange}
                onChange={(value) =>
                  setDraft({ ...draft, mobileImageUrl: value || null })
                }
              />
            </div>
          </section>

          {/* Section C: Appearance Settings */}
          <section className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-4 sm:p-5">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-[#101B30]">
                3. إعدادات المظهر
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                اضبط لون وشفافية طبقة التراكب والتمويه لتحسين وضوح النصوص فوق الصورة.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="min-w-0">
                <label
                  htmlFor="ad-overlay-color"
                  className="mb-1.5 block text-xs font-bold text-neutral-800"
                >
                  لون التراكب
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5">
                  <input
                    id="ad-overlay-color"
                    type="color"
                    disabled={busy}
                    value={draft.overlayColor}
                    onChange={(event) =>
                      setDraft({ ...draft, overlayColor: event.target.value })
                    }
                    className="h-8 w-10 cursor-pointer rounded-md border-0 bg-transparent p-0"
                  />
                  <span dir="ltr" className="font-mono text-xs font-semibold text-neutral-700 uppercase">
                    {draft.overlayColor}
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="ad-overlay-opacity"
                  className="mb-1.5 flex items-center justify-between text-xs font-bold text-neutral-800"
                >
                  <span>شفافية التراكب</span>
                  <span className="font-mono text-[#C8102E]">{draft.overlayOpacity}%</span>
                </label>
                <input
                  id="ad-overlay-opacity"
                  type="range"
                  min={0}
                  max={80}
                  step={1}
                  disabled={busy}
                  value={draft.overlayOpacity}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      overlayOpacity: Number(event.target.value),
                    })
                  }
                  className="mt-2 w-full accent-[#C8102E]"
                />
                <span className="mt-1 block text-[11px] text-neutral-400">
                  النطاق المسموح: 0% إلى 80%
                </span>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="ad-blur"
                  className="mb-1.5 flex items-center justify-between text-xs font-bold text-neutral-800"
                >
                  <span>تمويه الخلفية</span>
                  <span className="font-mono text-[#101B30]">{draft.blur}px</span>
                </label>
                <input
                  id="ad-blur"
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  disabled={busy}
                  value={draft.blur}
                  onChange={(event) =>
                    setDraft({ ...draft, blur: Number(event.target.value) })
                  }
                  className="mt-2 w-full accent-[#101B30]"
                />
                <span className="mt-1 block text-[11px] text-neutral-400">
                  النطاق المسموح: 0px إلى 20px
                </span>
              </div>
            </div>

            {/* Live Mini Preview */}
            <div className="relative flex min-h-[120px] items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-[#101B30] p-4 text-center text-white">
              {previewBgImage && (
                <img
                  src={resolvePublicImageUrl(previewBgImage)}
                  alt=""
                  style={{ filter: draft.blur > 0 ? `blur(${draft.blur}px)` : undefined }}
                  className="absolute inset-0 h-full w-full scale-[1.03] object-cover"
                />
              )}
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: draft.overlayColor,
                  opacity: previewBgImage ? draft.overlayOpacity / 100 : 1,
                }}
              />
              <div className="relative z-10 space-y-1">
                {draft.subtitle && (
                  <p className="text-[11px] font-semibold text-[#D6A33A]">{draft.subtitle}</p>
                )}
                <p className="text-sm font-black">
                  {draft.title || "معاينة فورية للمظهر"}
                </p>
                {draft.buttonLabel && (
                  <span className="mt-1 inline-block rounded-lg bg-[#C8102E] px-3 py-1 text-[11px] font-bold">
                    {draft.buttonLabel}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Section D: Display & Scheduling */}
          <section className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-4 sm:p-5">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-[#101B30]">
                4. إعدادات العرض والجدولة
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                تحكم في أولوية الظهور، وتوقيت البدء والانتهاء، وحالة التفعيل.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="ad-sort-order"
                  className="mb-1.5 block text-xs font-bold text-neutral-800"
                >
                  ترتيب الظهور
                </label>
                <input
                  id="ad-sort-order"
                  type="number"
                  min={0}
                  max={10000}
                  disabled={busy}
                  value={draft.sortOrder}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      sortOrder: Number.isNaN(Number(event.target.value))
                        ? 0
                        : Number(event.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-[#C8102E] focus:outline-hidden"
                />
                <span className="mt-1 block text-[11px] text-neutral-400">
                  الأرقام الأصغر تظهر أولاً (0 – 10000).
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3">
                <div>
                  <span className="block text-xs font-bold text-neutral-800">
                    حالة الإعلان
                  </span>
                  <span className="block text-[11px] text-neutral-500">
                    {draft.isEnabled ? "سيظهر الإعلان في المتجر" : "الإعلان متوقف حاليًا"}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.isEnabled}
                  disabled={busy}
                  onClick={() => setDraft({ ...draft, isEnabled: !draft.isEnabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    draft.isEnabled ? "bg-[#C8102E]" : "bg-neutral-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                      draft.isEnabled ? "-translate-x-6" : "-translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="ad-starts-at"
                  className="mb-1.5 block text-xs font-bold text-neutral-800"
                >
                  تاريخ ووقت البدء (اختياري)
                </label>
                <input
                  id="ad-starts-at"
                  type="datetime-local"
                  disabled={busy}
                  value={toLocalDateTimeInput(draft.startsAt)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      startsAt: fromLocalDateTimeInput(event.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-[#C8102E] focus:outline-hidden"
                />
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="ad-ends-at"
                  className="mb-1.5 block text-xs font-bold text-neutral-800"
                >
                  تاريخ ووقت الانتهاء (اختياري)
                </label>
                <input
                  id="ad-ends-at"
                  type="datetime-local"
                  disabled={busy}
                  value={toLocalDateTimeInput(draft.endsAt)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      endsAt: fromLocalDateTimeInput(event.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-[#C8102E] focus:outline-hidden"
                />
              </div>
            </div>
          </section>

          {/* Section E: Destination */}
          <section className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-4 sm:p-5">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-[#101B30]">
                5. الوجهة والزر
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                حدد الصفحة أو الرابط الذي ينتقل إليه العميل عند النقر على الإعلان.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="ad-button-label"
                  className="mb-1.5 block text-xs font-bold text-neutral-800"
                >
                  نص الزر (اختياري)
                </label>
                <input
                  id="ad-button-label"
                  type="text"
                  maxLength={80}
                  disabled={busy}
                  value={draft.buttonLabel ?? ""}
                  placeholder="مثال: تسوّق الآن"
                  onChange={(event) =>
                    setDraft({ ...draft, buttonLabel: event.target.value || null })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#C8102E] focus:outline-hidden"
                />
                <span className="mt-1 block text-[11px] text-neutral-400">
                  عند كتابة نص للزر، يصبح رابط الوجهة مطلوبًا.
                </span>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="ad-link-url"
                  className="mb-1.5 block text-xs font-bold text-neutral-800"
                >
                  رابط الوجهة {draft.buttonLabel ? "*" : "(اختياري)"}
                </label>
                <input
                  id="ad-link-url"
                  type="text"
                  dir="ltr"
                  disabled={busy}
                  value={draft.linkUrl ?? ""}
                  placeholder="/catalog أو https://..."
                  onChange={(event) =>
                    setDraft({ ...draft, linkUrl: event.target.value || null })
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-left font-mono text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#C8102E] focus:outline-hidden"
                />
                <span className="mt-1 block text-[11px] text-neutral-400">
                  يقبل مسارًا داخليًا يبدأ بـ / أو رابطًا خارجيًا يبدأ بـ https://.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:px-6">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-[#C8102E] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#a50d26] disabled:opacity-60"
          >
            {busy ? "جارٍ الحفظ..." : isEditing ? "حفظ التعديلات" : "إضافة الإعلان"}
          </button>
        </div>
      </form>
    </div>
  );
}
