import { useEffect, useState } from "react";
import { resolvePublicImageUrl } from "../../../../utils/media";
import type { AdminCategory } from "../../api/management";

interface CategoryPreviewModalProps {
  category: AdminCategory | null;
  parentCategory: AdminCategory | null;
  subcategories: AdminCategory[];
  onClose: () => void;
  onEdit: (category: AdminCategory) => void;
  onSelectCategory: (category: AdminCategory) => void;
}

export default function CategoryPreviewModal({
  category,
  parentCategory,
  subcategories,
  onClose,
  onEdit,
  onSelectCategory,
}: CategoryPreviewModalProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [category?.id, category?.imageUrl]);

  useEffect(() => {
    if (!category) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [category, onClose]);

  if (!category) return null;

  const resolvedUrl = category.imageUrl ? resolvePublicImageUrl(category.imageUrl) : "";
  const showImage = Boolean(resolvedUrl) && !imageFailed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101B30]/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-preview-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Image Banner */}
        <div className="relative aspect-[16/9] bg-neutral-100">
          {showImage ? (
            <img
              src={resolvedUrl}
              alt={category.name}
              onError={() => setImageFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#101B30] via-[#172642] to-[#24365a] flex flex-col items-center justify-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-[#D6A33A]/40 flex items-center justify-center text-[#D6A33A] text-2xl font-black">
                {category.name.trim().slice(0, 1) || "ق"}
              </div>
              <span className="text-xs text-slate-300">لا توجد صورة للقسم</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المعاينة"
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/95 text-[#101B30] hover:bg-white shadow-sm flex items-center justify-center text-xs font-bold transition-colors"
          >
            ✕
          </button>

          <div className="absolute top-3 right-3">
            {category.parentId ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#C8102E] text-white text-xs font-bold shadow-xs">
                قسم فرعي
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#101B30]/90 text-white text-xs font-bold shadow-xs">
                قسم رئيسي
              </span>
            )}
          </div>
        </div>

        {/* Details Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 id="category-preview-title" className="text-lg font-black text-[#101B30] break-words">
                {category.name}
              </h3>
              <p dir="ltr" className="text-xs font-mono text-neutral-400 text-right mt-0.5 break-all">
                /{category.slug}
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-neutral-100 text-[#101B30] text-xs font-bold shrink-0 tabular-nums">
              {category.productCount.toLocaleString("ar-EG")} منتج
            </span>
          </div>

          {parentCategory && (
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between text-xs">
              <span className="text-neutral-500">القسم الأب:</span>
              <button
                type="button"
                onClick={() => onSelectCategory(parentCategory)}
                className="font-bold text-[#C8102E] hover:underline"
              >
                {parentCategory.name}
              </button>
            </div>
          )}

          {subcategories.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-700">
                الأقسام الفرعية ({subcategories.length.toLocaleString("ar-EG")})
              </h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onSelectCategory(sub)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D6A33A]/15 hover:bg-[#D6A33A]/25 text-[#101B30] text-xs font-semibold transition-colors"
                  >
                    <span>{sub.name}</span>
                    <span className="text-[10px] text-neutral-500 tabular-nums">
                      ({sub.productCount.toLocaleString("ar-EG")})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(category);
              }}
              className="px-4 py-2 rounded-xl bg-[#101B30] hover:bg-[#1b2b4a] text-xs font-bold text-white shadow-xs transition-colors"
            >
              تعديل القسم
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
