import { formatEGP, type BundlePublic } from "@store/shared";
import { resolvePublicImageUrl } from "../../../../utils/media";
import StatusBadge from "./StatusBadge";
import { formatArabicShortDate, getPromotionStatus } from "./lifecycle";

interface BundleCardProps {
  bundle: BundlePublic;
  onPreview: (bundle: BundlePublic) => void;
  onEdit: (bundle: BundlePublic) => void;
  onToggleStatus: (bundle: BundlePublic) => void;
  onDelete: (bundle: BundlePublic) => void;
  toggling?: boolean;
}

export default function BundleCard({
  bundle,
  onPreview,
  onEdit,
  onToggleStatus,
  onDelete,
  toggling = false,
}: BundleCardProps) {
  const status = getPromotionStatus({
    isActive: bundle.isActive,
    startsAt: bundle.startsAt,
    endsAt: bundle.endsAt,
  });

  const stock = bundle.availableStock ?? 0;

  return (
    <article className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md hover:border-neutral-300 transition-all flex flex-col justify-between overflow-hidden min-w-0">
      {/* Media Header */}
      <div className="relative aspect-[16/9] bg-neutral-100 overflow-hidden border-b border-neutral-100">
        {bundle.imageUrl ? (
          <img
            src={resolvePublicImageUrl(bundle.imageUrl)}
            alt={bundle.publicTitle}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 bg-gradient-to-br from-neutral-100 to-neutral-50">
            <svg className="w-9 h-9 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <span className="text-[11px] font-medium">بدون صورة للباقة</span>
          </div>
        )}

        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
          <StatusBadge status={status} />
          {bundle.isFreeShipping && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#D6A33A] text-[#101B30] shadow-xs">
              شحن مجاني
            </span>
          )}
        </div>

        <div className="absolute bottom-2.5 left-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/65 text-white backdrop-blur-xs">
            ترتيب #{bundle.displayOrder}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 flex-1">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[#101B30] truncate" title={bundle.publicTitle}>
            {bundle.publicTitle}
          </h3>
          <p className="text-[11px] text-neutral-400 font-mono truncate mt-0.5">
            {bundle.internalName}
          </p>
        </div>

        {bundle.description && (
          <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
            {bundle.description}
          </p>
        )}

        {/* Pricing & Stock */}
        <div className="grid grid-cols-2 gap-2.5 bg-neutral-50 rounded-xl p-3 border border-neutral-100">
          <div className="min-w-0">
            <span className="block text-[11px] text-neutral-500">التسعير</span>
            {bundle.fixedPriceCents !== null && bundle.fixedPriceCents !== undefined ? (
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm font-extrabold text-[#C8102E]">
                  {formatEGP(bundle.fixedPriceCents)}
                </span>
                {bundle.totalOriginalPriceCents &&
                bundle.totalOriginalPriceCents > bundle.fixedPriceCents ? (
                  <span className="text-[11px] text-neutral-400 line-through">
                    {formatEGP(bundle.totalOriginalPriceCents)}
                  </span>
                ) : null}
              </div>
            ) : bundle.discountCents ? (
              <span className="text-sm font-extrabold text-emerald-700">
                خصم {formatEGP(bundle.discountCents)}
              </span>
            ) : (
              <span className="text-xs text-neutral-500">-</span>
            )}
          </div>

          <div className="min-w-0">
            <span className="block text-[11px] text-neutral-500">المخزون المتاح</span>
            <span
              className={`text-xs font-bold ${
                stock > 0 ? "text-[#101B30]" : "text-rose-600"
              }`}
            >
              {stock > 0 ? `${stock} باقة متاحة` : "نفد المخزون"}
            </span>
          </div>
        </div>

        {/* Items Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>مكونات الباقة</span>
            <span className="font-bold text-[#101B30]">{bundle.items.length} منتج</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bundle.items.slice(0, 3).map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 max-w-[180px] truncate px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-medium"
                title={item.product?.name || item.productId}
              >
                <span className="font-bold text-[#C8102E]">{item.quantity}×</span>
                <span className="truncate">{item.product?.name || "منتج"}</span>
              </span>
            ))}
            {bundle.items.length > 3 && (
              <span className="inline-block px-2 py-0.5 rounded-md bg-[#101B30]/5 text-[#101B30] text-[11px] font-bold">
                +{bundle.items.length - 3} أخرى
              </span>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
          <div className="min-w-0">
            <span className="block text-neutral-400">تاريخ البدء</span>
            <span className="font-semibold text-neutral-700 truncate block">
              {formatArabicShortDate(bundle.startsAt)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-neutral-400">تاريخ الانتهاء</span>
            <span className="font-semibold text-neutral-700 truncate block">
              {formatArabicShortDate(bundle.endsAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-neutral-50/70 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={toggling}
          onClick={() => onToggleStatus(bundle)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-50 ${
            bundle.isActive
              ? "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100"
              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {bundle.isActive ? "تعطيل" : "تفعيل"}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPreview(bundle)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            معاينة
          </button>
          <button
            type="button"
            onClick={() => onEdit(bundle)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-[#101B30]/20 bg-[#101B30]/5 text-[#101B30] hover:bg-[#101B30]/10 transition-colors"
          >
            تعديل
          </button>
          <button
            type="button"
            onClick={() => onDelete(bundle)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
          >
            حذف
          </button>
        </div>
      </div>
    </article>
  );
}
