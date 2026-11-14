import { formatEGP, type ProductOfferPublic } from "@store/shared";
import StatusBadge from "./StatusBadge";
import { formatArabicShortDate, getPromotionStatus } from "./lifecycle";

interface OfferCardProps {
  offer: ProductOfferPublic;
  productNameById: Map<string, string>;
  onPreview: (offer: ProductOfferPublic) => void;
  onEdit: (offer: ProductOfferPublic) => void;
  onToggleStatus: (offer: ProductOfferPublic) => void;
  onDelete: (offer: ProductOfferPublic) => void;
  toggling?: boolean;
}

export default function OfferCard({
  offer,
  productNameById,
  onPreview,
  onEdit,
  onToggleStatus,
  onDelete,
  toggling = false,
}: OfferCardProps) {
  const status = getPromotionStatus({
    isActive: offer.isActive,
    startsAt: offer.startsAt,
    endsAt: offer.endsAt,
  });

  const discountLabel =
    offer.discountType === "PERCENTAGE"
      ? `${offer.discountValue}%`
      : formatEGP(offer.discountValue);

  const linkedNames = offer.productIds
    .slice(0, 3)
    .map((id) => productNameById.get(id) || "منتج")
    .filter(Boolean);
  const extraCount = Math.max(0, offer.productIds.length - linkedNames.length);

  return (
    <article className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md hover:border-neutral-300 transition-all flex flex-col justify-between overflow-hidden min-w-0">
      {/* Top Discount Banner Strip */}
      <div className="px-5 pt-4 pb-3 border-b border-neutral-100 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-[#C8102E] text-white">
              خصم {discountLabel}
            </span>
            {offer.isFreeShipping && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-[#D6A33A]/15 text-[#8A6210] border border-[#D6A33A]/30">
                شحن مجاني
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-[#101B30] truncate" title={offer.name}>
            {offer.name}
          </h3>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 flex-1">
        {offer.description ? (
          <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
            {offer.description}
          </p>
        ) : (
          <p className="text-xs text-neutral-400 italic">بدون وصف إضافي</p>
        )}

        {/* Discount & Cap Details */}
        <div className="grid grid-cols-2 gap-2.5 bg-neutral-50 rounded-xl p-3 border border-neutral-100">
          <div className="min-w-0">
            <span className="block text-[11px] text-neutral-500">نوع العرض</span>
            <span className="text-xs font-bold text-[#101B30]">
              {offer.discountType === "PERCENTAGE" ? "نسبة مئوية" : "مبلغ ثابت"}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] text-neutral-500">سقف الخصم</span>
            <span className="text-xs font-bold text-[#101B30]">
              {offer.maxDiscountCents ? formatEGP(offer.maxDiscountCents) : "بدون سقف"}
            </span>
          </div>
        </div>

        {/* Target Products */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>المنتجات المشمولة</span>
            <span className="font-bold text-[#101B30]">{offer.productIds.length} منتج</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {linkedNames.map((name, idx) => (
              <span
                key={`${offer.id}-p-${idx}`}
                className="inline-block max-w-[160px] truncate px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[11px] font-medium"
                title={name}
              >
                {name}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="inline-block px-2 py-0.5 rounded-md bg-[#101B30]/5 text-[#101B30] text-[11px] font-bold">
                +{extraCount} أخرى
              </span>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
          <div className="min-w-0">
            <span className="block text-neutral-400">تاريخ البدء</span>
            <span className="font-semibold text-neutral-700 truncate block">
              {formatArabicShortDate(offer.startsAt)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-neutral-400">تاريخ الانتهاء</span>
            <span className="font-semibold text-neutral-700 truncate block">
              {formatArabicShortDate(offer.endsAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-neutral-50/70 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={toggling}
          onClick={() => onToggleStatus(offer)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-50 ${
            offer.isActive
              ? "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100"
              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {offer.isActive ? "تعطيل" : "تفعيل"}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPreview(offer)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            معاينة
          </button>
          <button
            type="button"
            onClick={() => onEdit(offer)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-[#101B30]/20 bg-[#101B30]/5 text-[#101B30] hover:bg-[#101B30]/10 transition-colors"
          >
            تعديل
          </button>
          <button
            type="button"
            onClick={() => onDelete(offer)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
          >
            حذف
          </button>
        </div>
      </div>
    </article>
  );
}
