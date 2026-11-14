import { useEffect, useState } from "react";
import { resolvePublicImageUrl } from "../../../../utils/media";
import type { AdminCategory } from "../../api/management";

interface CategoryCardProps {
  category: AdminCategory;
  parentName?: string | null;
  childrenCount: number;
  onPreview: (category: AdminCategory) => void;
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
}

export function CategoryCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden flex flex-col animate-pulse">
      <div className="aspect-[16/10] bg-neutral-200/80 w-full" />
      <div className="p-4 space-y-3 flex-1">
        <div className="h-5 w-2/3 bg-neutral-200 rounded-md" />
        <div className="h-3.5 w-1/2 bg-neutral-100 rounded-md" />
        <div className="h-3.5 w-1/3 bg-neutral-100 rounded-md pt-2" />
      </div>
      <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center gap-2">
        <div className="h-9 flex-1 bg-neutral-200/70 rounded-xl" />
        <div className="h-9 flex-1 bg-neutral-200/70 rounded-xl" />
        <div className="h-9 w-10 bg-neutral-200/70 rounded-xl" />
      </div>
    </div>
  );
}

export default function CategoryCard({
  category,
  parentName,
  childrenCount,
  onPreview,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [category.imageUrl]);

  const resolvedUrl = category.imageUrl ? resolvePublicImageUrl(category.imageUrl) : "";
  const showImage = Boolean(resolvedUrl) && !imageFailed;
  const isSubcategory = Boolean(category.parentId);

  return (
    <article className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md hover:border-[#C8102E]/30 transition-all duration-200 flex flex-col h-full overflow-hidden group min-w-0">
      {/* Category Image Header */}
      <div className="relative aspect-[16/10] bg-neutral-100 overflow-hidden shrink-0">
        {showImage ? (
          <img
            src={resolvedUrl}
            alt={category.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#101B30] via-[#172642] to-[#24365a] flex flex-col items-center justify-center gap-2 p-4 relative">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-[#D6A33A]/40 flex items-center justify-center text-[#D6A33A] text-xl font-black shadow-inner">
              {category.name.trim().slice(0, 1) || "ق"}
            </div>
            <span className="text-[11px] font-medium text-slate-300/80">لا توجد صورة للقسم</span>
          </div>
        )}

        {/* Subtle bottom gradient for badge legibility */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />

        {/* Top-Right Badge: Hierarchy */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isSubcategory ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#C8102E] text-white text-[11px] font-bold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
              قسم فرعي
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101B30]/90 backdrop-blur-xs text-white text-[11px] font-bold shadow-xs border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A33A]" />
              قسم رئيسي
            </span>
          )}
        </div>

        {/* Top-Left Badge: Product Count */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-[#101B30] text-[11px] font-bold shadow-xs border border-neutral-200/70 tabular-nums">
            {category.productCount.toLocaleString("ar-EG")} منتج
          </span>
        </div>
      </div>

      {/* Category Details */}
      <div className="p-4 flex-1 flex flex-col gap-2 min-w-0">
        <div className="min-w-0">
          <h3
            title={category.name}
            className="text-base font-bold text-[#101B30] truncate leading-snug group-hover:text-[#C8102E] transition-colors"
          >
            {category.name}
          </h3>
          <p
            dir="ltr"
            title={`/${category.slug}`}
            className="text-xs font-mono text-neutral-400 truncate mt-0.5 text-right"
          >
            /{category.slug}
          </p>
        </div>

        {/* Relationship / Subcategory Indicator */}
        <div className="mt-auto pt-2 border-t border-neutral-100 flex items-center justify-between gap-2 text-xs min-w-0">
          {isSubcategory ? (
            <span className="inline-flex items-center gap-1.5 text-neutral-600 font-medium truncate min-w-0">
              <svg className="w-3.5 h-3.5 text-[#C8102E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="truncate">تابع لـ: <strong className="text-[#101B30]">{parentName || "قسم رئيسي"}</strong></span>
            </span>
          ) : childrenCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[#9a6f16] bg-[#D6A33A]/15 px-2.5 py-1 rounded-lg font-bold text-[11px]">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>{childrenCount.toLocaleString("ar-EG")} قسم فرعي</span>
            </span>
          ) : (
            <span className="text-[11px] text-neutral-400 font-medium">بدون أقسام فرعية</span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="px-4 py-3 bg-neutral-50/90 border-t border-neutral-100 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onPreview(category)}
          aria-label={`معاينة قسم ${category.name}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-xs font-semibold text-neutral-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>معاينة</span>
        </button>

        <button
          type="button"
          onClick={() => onEdit(category)}
          aria-label={`تعديل قسم ${category.name}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-xl bg-[#101B30] hover:bg-[#1b2b4a] text-xs font-bold text-white shadow-xs transition-colors"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>تعديل</span>
        </button>

        <button
          type="button"
          onClick={() => onDelete(category)}
          aria-label={`حذف قسم ${category.name}`}
          title="حذف القسم"
          className="inline-flex items-center justify-center min-h-[36px] min-w-[38px] px-2.5 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </article>
  );
}
