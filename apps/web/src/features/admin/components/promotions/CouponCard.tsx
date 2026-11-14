import { useState } from "react";
import { formatEGP, type CouponPublic } from "@store/shared";
import StatusBadge from "./StatusBadge";
import { formatArabicShortDate, getPromotionStatus } from "./lifecycle";

interface CouponCardProps {
  coupon: CouponPublic;
  onDetails: (coupon: CouponPublic) => void;
  onEdit: (coupon: CouponPublic) => void;
  onToggleStatus: (coupon: CouponPublic) => void;
  onDelete: (coupon: CouponPublic) => void;
  toggling?: boolean;
}

export default function CouponCard({
  coupon,
  onDetails,
  onEdit,
  onToggleStatus,
  onDelete,
  toggling = false,
}: CouponCardProps) {
  const [copied, setCopied] = useState(false);

  const status = getPromotionStatus({
    isActive: coupon.isActive,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    usageLimit: coupon.usageLimit,
    usageCount: coupon.usageCount,
  });

  const discountLabel =
    coupon.discountType === "PERCENTAGE"
      ? `${coupon.discountValue}%`
      : coupon.discountType === "FIXED_AMOUNT"
        ? formatEGP(coupon.discountValue)
        : "شحن مجاني";

  const discountTypeLabel =
    coupon.discountType === "PERCENTAGE"
      ? "نسبة مئوية"
      : coupon.discountType === "FIXED_AMOUNT"
        ? "مبلغ ثابت"
        : "شحن مجاني";

  const usagePercent =
    coupon.usageLimit && coupon.usageLimit > 0
      ? Math.min(100, Math.round((coupon.usageCount / coupon.usageLimit) * 100))
      : null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <article className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md hover:border-neutral-300 transition-all flex flex-col justify-between overflow-hidden min-w-0">
      {/* Ticket Identity Header */}
      <div className="bg-[#101B30] text-white px-5 py-4 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                dir="ltr"
                className="font-mono text-base font-extrabold tracking-wider bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg text-[#D6A33A] truncate max-w-full"
              >
                {coupon.code}
              </span>
              <button
                type="button"
                onClick={() => void handleCopy()}
                title="نسخ الكود"
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white transition-colors shrink-0"
              >
                {copied ? "تم النسخ ✓" : "نسخ"}
              </button>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="text-xl font-black text-white">
            {coupon.discountType === "FREE_SHIPPING" ? "شحن مجاني 100%" : `خصم ${discountLabel}`}
          </span>
          <span className="text-[11px] text-slate-300 font-medium">{discountTypeLabel}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 flex-1">
        {coupon.description ? (
          <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
            {coupon.description}
          </p>
        ) : (
          <p className="text-xs text-neutral-400 italic">بدون وصف إضافي</p>
        )}

        {/* Conditions */}
        <div className="grid grid-cols-2 gap-2.5 bg-neutral-50 rounded-xl p-3 border border-neutral-100">
          <div className="min-w-0">
            <span className="block text-[11px] text-neutral-500">الحد الأدنى للطلب</span>
            <span className="text-xs font-bold text-[#101B30]">
              {coupon.minSubtotalCents > 0 ? formatEGP(coupon.minSubtotalCents) : "بدون حد أدنى"}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] text-neutral-500">سقف الخصم</span>
            <span className="text-xs font-bold text-[#101B30]">
              {coupon.maxDiscountCents ? formatEGP(coupon.maxDiscountCents) : "بدون سقف"}
            </span>
          </div>
        </div>

        {/* Usage Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">مرات الاستخدام</span>
            <span className="font-bold text-[#101B30] tabular-nums">
              {coupon.usageCount}
              {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " (غير محدود)"}
            </span>
          </div>
          {usagePercent !== null && (
            <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent >= 100
                    ? "bg-rose-500"
                    : usagePercent >= 80
                      ? "bg-[#D6A33A]"
                      : "bg-[#C8102E]"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Validity Dates */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
          <div className="min-w-0">
            <span className="block text-neutral-400">تاريخ البدء</span>
            <span className="font-semibold text-neutral-700 truncate block">
              {formatArabicShortDate(coupon.startsAt)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-neutral-400">تاريخ الانتهاء</span>
            <span className="font-semibold text-neutral-700 truncate block">
              {formatArabicShortDate(coupon.endsAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-neutral-50/70 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={toggling}
          onClick={() => onToggleStatus(coupon)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-50 ${
            coupon.isActive
              ? "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100"
              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {coupon.isActive ? "تعطيل" : "تفعيل"}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onDetails(coupon)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            عرض التفاصيل
          </button>
          <button
            type="button"
            onClick={() => onEdit(coupon)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-[#101B30]/20 bg-[#101B30]/5 text-[#101B30] hover:bg-[#101B30]/10 transition-colors"
          >
            تعديل
          </button>
          <button
            type="button"
            onClick={() => onDelete(coupon)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
          >
            حذف
          </button>
        </div>
      </div>
    </article>
  );
}
