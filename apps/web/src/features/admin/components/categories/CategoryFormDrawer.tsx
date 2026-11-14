import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { getAdminSession } from "../../api/auth";
import { uploadAdminImage } from "../../api/media";
import { resolvePublicImageUrl } from "../../../../utils/media";
import type { AdminCategory } from "../../api/management";

export interface CategoryFormValues {
  name: string;
  slug?: string;
  parentId: string | null;
  imageUrl: string | null;
}

interface CategoryFormDrawerProps {
  open: boolean;
  mode: "create" | "edit";
  category: AdminCategory | null;
  categories: AdminCategory[];
  csrfToken: string | null;
  submitting: boolean;
  apiError: string | null;
  onCsrfTokenChange: (token: string) => void;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
}

function collectDescendantIds(rootId: string, categories: AdminCategory[]): Set<string> {
  const blocked = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const cat of categories) {
      if (cat.parentId && blocked.has(cat.parentId) && !blocked.has(cat.id)) {
        blocked.add(cat.id);
        changed = true;
      }
    }
  }
  return blocked;
}

export default function CategoryFormDrawer({
  open,
  mode,
  category,
  categories,
  csrfToken,
  submitting,
  apiError,
  onCsrfTokenChange,
  onClose,
  onSubmit,
}: CategoryFormDrawerProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && category) {
      setName(category.name);
      setSlug(category.slug);
      setParentId(category.parentId || "");
      setImageUrl(category.imageUrl || "");
    } else {
      setName("");
      setSlug("");
      setParentId("");
      setImageUrl("");
    }
    setValidationError(null);
    setUploadError(null);
    setPreviewFailed(false);
  }, [open, mode, category]);

  useEffect(() => {
    setPreviewFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting && !uploading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, submitting, uploading, onClose]);

  const parentOptions = useMemo(() => {
    if (mode === "edit" && category) {
      const blockedIds = collectDescendantIds(category.id, categories);
      return categories.filter((c) => !blockedIds.has(c.id));
    }
    return categories;
  }, [mode, category, categories]);

  const childrenCount = useMemo(() => {
    if (mode !== "edit" || !category) return 0;
    return categories.filter((c) => c.parentId === category.id).length;
  }, [mode, category, categories]);

  if (!open) return null;

  const resolvedPreview = imageUrl.trim() ? resolvePublicImageUrl(imageUrl.trim()) : "";
  const showPreview = Boolean(resolvedPreview) && !previewFailed;
  const combinedError = validationError || apiError;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setUploadError(null);
    if (
      !file.type.startsWith("image/") ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setUploadError("يرجى اختيار صورة بصيغة PNG أو JPG أو WebP وبحجم لا يتجاوز 5 ميجابايت.");
      return;
    }

    setUploading(true);
    try {
      const session = await getAdminSession();
      if (!session) {
        setUploadError("انتهت جلسة الإدارة. يرجى تسجيل الدخول مرة أخرى.");
        return;
      }
      const activeToken = session.csrfToken || csrfToken;
      if (!activeToken) {
        setUploadError("تعذر التحقق من رمز الحماية (CSRF).");
        return;
      }
      onCsrfTokenChange(activeToken);
      const uploaded = await uploadAdminImage(file, activeToken);
      setImageUrl(uploaded.url);
      setPreviewFailed(false);
    } catch {
      setUploadError("تعذر رفع الصورة. تحققي من الاتصال ثم حاولي مرة أخرى.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setValidationError("يرجى إدخال اسم القسم (حرفان على الأقل).");
      return;
    }

    setValidationError(null);
    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    await onSubmit({
      name: trimmedName,
      slug: cleanSlug || undefined,
      parentId: parentId || null,
      imageUrl: imageUrl.trim() || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#101B30]/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting && !uploading) {
          onClose();
        }
      }}
    >
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-r border-neutral-200 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between gap-4 bg-white shrink-0">
          <div className="min-w-0">
            <span className="inline-block text-[11px] font-bold text-[#C8102E] mb-0.5">
              {mode === "create" ? "إضافة قسم جديد" : "تعديل بيانات القسم"}
            </span>
            <h2 id="category-drawer-title" className="text-lg font-black text-[#101B30] truncate">
              {mode === "create" ? "قسم جديد في المتجر" : category?.name || "تعديل القسم"}
            </h2>
          </div>
          <button
            type="button"
            disabled={submitting || uploading}
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-xl border border-neutral-200 text-neutral-500 hover:text-[#101B30] hover:bg-neutral-100 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Drawer Form Body */}
        <form id="category-drawer-form" onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto p-6 space-y-6">
          {combinedError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5"
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{combinedError}</span>
            </div>
          )}

          {/* Section A: Basic Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
              <span className="w-6 h-6 rounded-lg bg-[#101B30] text-white text-xs font-bold flex items-center justify-center">
                أ
              </span>
              <h3 className="text-sm font-bold text-[#101B30]">المعلومات الأساسية</h3>
            </div>

            <div>
              <label htmlFor="cat-name-input" className="block text-xs font-bold text-neutral-700 mb-1.5">
                اسم القسم <span className="text-[#C8102E]">*</span>
              </label>
              <input
                id="cat-name-input"
                type="text"
                required
                value={name}
                disabled={submitting}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: فساتين سهرة"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-[#101B30] placeholder:text-neutral-400 focus:outline-hidden focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10 disabled:bg-neutral-50"
              />
            </div>

            <div>
              <label htmlFor="cat-slug-input" className="block text-xs font-bold text-neutral-700 mb-1.5">
                الرابط المخصص (Slug إنجليزي)
              </label>
              <input
                id="cat-slug-input"
                type="text"
                dir="ltr"
                value={slug}
                disabled={submitting}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="evening-dresses"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-left font-mono text-[#101B30] placeholder:text-neutral-400 focus:outline-hidden focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10 disabled:bg-neutral-50"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                اختياري — يُترك فارغاً ليتم توليده تلقائياً باللغة الإنجليزية.
              </p>
            </div>

            <div>
              <label htmlFor="cat-parent-select" className="block text-xs font-bold text-neutral-700 mb-1.5">
                القسم الأب (لإنشاء قسم فرعي)
              </label>
              <select
                id="cat-parent-select"
                value={parentId}
                disabled={submitting}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-[#101B30] focus:outline-hidden focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10 disabled:bg-neutral-50"
              >
                <option value="">بدون قسم أب (قسم رئيسي)</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} {option.parentId ? "(فرعي)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Section B: Category Image */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#D6A33A] text-[#101B30] text-xs font-bold flex items-center justify-center">
                  ب
                </span>
                <h3 className="text-sm font-bold text-[#101B30]">صورة القسم</h3>
              </div>
              {imageUrl.trim() && (
                <button
                  type="button"
                  disabled={submitting || uploading}
                  onClick={() => {
                    setImageUrl("");
                    setUploadError(null);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline disabled:opacity-50"
                >
                  إزالة الصورة
                </button>
              )}
            </div>

            {/* Image Preview / Upload Zone */}
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/70 overflow-hidden">
              {showPreview ? (
                <div className="relative aspect-[16/10] bg-neutral-100 group">
                  <img
                    src={resolvedPreview}
                    alt="معاينة صورة القسم"
                    onError={() => setPreviewFailed(true)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#101B30]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
                    <button
                      type="button"
                      disabled={submitting || uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-white text-[#101B30] text-xs font-bold shadow-sm hover:bg-neutral-100 transition-colors"
                    >
                      تغيير الصورة
                    </button>
                    <button
                      type="button"
                      disabled={submitting || uploading}
                      onClick={() => setImageUrl("")}
                      className="px-3.5 py-2 rounded-xl bg-[#C8102E] text-white text-xs font-bold shadow-sm hover:bg-[#a50d26] transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 px-4 flex flex-col items-center justify-center gap-2 text-center hover:bg-neutral-100/70 transition-colors disabled:opacity-60"
                >
                  <div className="w-11 h-11 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center justify-center text-[#C8102E]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#101B30]">
                    {uploading ? "جارٍ رفع الصورة..." : "اضغط لرفع صورة القسم"}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    PNG أو JPG أو WebP بحد أقصى 5 ميجابايت
                  </span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={submitting || uploading}
                onChange={(e) => void handleFileChange(e)}
                className="hidden"
              />
            </div>

            {uploadError && (
              <p role="alert" className="text-xs text-rose-600 font-medium">
                {uploadError}
              </p>
            )}

            <div>
              <label htmlFor="cat-image-url-input" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                أو أدخل رابط الصورة مباشرة
              </label>
              <input
                id="cat-image-url-input"
                type="url"
                inputMode="url"
                dir="ltr"
                value={imageUrl}
                disabled={submitting || uploading}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/category-image.jpg"
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-left font-mono text-[#101B30] placeholder:text-neutral-400 focus:outline-hidden focus:border-[#C8102E] disabled:bg-neutral-50"
              />
            </div>
          </section>

          {/* Section C: Existing Category Metadata (Edit Mode Only) */}
          {mode === "edit" && category && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                <span className="w-6 h-6 rounded-lg bg-neutral-200 text-[#101B30] text-xs font-bold flex items-center justify-center">
                  ج
                </span>
                <h3 className="text-sm font-bold text-[#101B30]">معلومات الارتباط</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70">
                  <span className="text-[11px] text-neutral-500 block">المنتجات المرتبطة</span>
                  <strong className="text-base font-black text-[#101B30] tabular-nums">
                    {category.productCount.toLocaleString("ar-EG")}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70">
                  <span className="text-[11px] text-neutral-500 block">الأقسام الفرعية</span>
                  <strong className="text-base font-black text-[#101B30] tabular-nums">
                    {childrenCount.toLocaleString("ar-EG")}
                  </strong>
                </div>
              </div>
            </section>
          )}
        </form>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            disabled={submitting || uploading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-xs font-bold text-neutral-700 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="category-drawer-form"
            disabled={submitting || uploading}
            className="px-5 py-2.5 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {submitting
              ? mode === "create"
                ? "جاري الإنشاء..."
                : "جاري الحفظ..."
              : mode === "create"
                ? "إنشاء القسم"
                : "حفظ التغييرات"}
          </button>
        </div>
      </div>
    </div>
  );
}
