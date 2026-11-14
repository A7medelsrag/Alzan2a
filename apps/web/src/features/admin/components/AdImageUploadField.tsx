import { useId, useState, type ChangeEvent } from "react";
import { uploadAdminImage } from "../api/media";
import { getAdminSession } from "../api/auth";
import { resolvePublicImageUrl } from "../../../utils/media";

interface AdImageUploadFieldProps {
  label: string;
  description?: string;
  value: string;
  csrfToken: string | null;
  disabled?: boolean;
  aspect?: "desktop" | "mobile";
  onChange: (value: string) => void;
  onCsrfTokenChange?: (token: string) => void;
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function AdImageUploadField({
  label,
  description,
  value,
  csrfToken,
  disabled = false,
  aspect = "desktop",
  onChange,
  onCsrfTokenChange,
}: AdImageUploadFieldProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setError("");
    if (!file.type.startsWith("image/") || !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) {
      setError("يرجى اختيار صورة بصيغة PNG أو JPG أو WebP وبحجم لا يتجاوز 5 ميجابايت.");
      return;
    }

    setUploading(true);
    try {
      const session = await getAdminSession();
      if (!session) {
        setError("انتهت الجلسة أو لا تملكين صلاحية رفع الصور.");
        return;
      }
      const currentCsrfToken = session.csrfToken || csrfToken;
      if (!currentCsrfToken) {
        setError("انتهت الجلسة أو لا تملكين صلاحية رفع الصور.");
        return;
      }
      onCsrfTokenChange?.(currentCsrfToken);
      const uploaded = await uploadAdminImage(file, currentCsrfToken);
      setPreviewFailed(false);
      onChange(uploaded.url);
    } catch {
      setError("تعذر رفع الصورة. يرجى التحقق من الاتصال والمحاولة مرة أخرى.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-2.5 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-neutral-800"
          >
            {label}
          </label>
          {description && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
              {description}
            </p>
          )}
        </div>
        {value && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => {
              setPreviewFailed(false);
              onChange("");
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors"
          >
            إزالة
          </button>
        )}
      </div>

      <input
        id={inputId}
        type="url"
        inputMode="url"
        dir="ltr"
        disabled={disabled || uploading}
        value={value}
        placeholder="https://example.com/banner.webp"
        onChange={(event) => {
          setPreviewFailed(false);
          onChange(event.target.value);
        }}
        className="w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left font-mono text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#C8102E] focus:outline-hidden disabled:bg-neutral-100"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          aria-disabled={disabled || uploading}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-2xs transition-colors hover:border-[#101B30] hover:bg-neutral-50 ${
            disabled || uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <svg className="h-4 w-4 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>{uploading ? "جارٍ رفع الصورة..." : "رفع صورة من الجهاز"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || uploading}
            onChange={(event) => void handleFileChange(event)}
            className="sr-only"
          />
        </label>
        <span className="text-[11px] text-neutral-500">
          PNG، JPG، WebP · بحد أقصى 5 ميجابايت
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700">
          {error}
        </p>
      )}

      {value && !previewFailed && (
        <div
          className={`relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900/5 ${
            aspect === "mobile" ? "mx-auto aspect-[9/12] max-w-[160px]" : "aspect-video w-full"
          }`}
        >
          <img
            src={resolvePublicImageUrl(value)}
            alt={label}
            loading="lazy"
            onError={() => setPreviewFailed(true)}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {value && previewFailed && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          تعذر تحميل معاينة الصورة من هذا الرابط. تأكدي من صحة الرابط أو ارفعي صورة جديدة.
        </div>
      )}
    </div>
  );
}
