import { getInvoicePaymentState } from "./purchasesHelpers";

interface InvoiceStatusBadgeProps {
  status: "DRAFT" | "CONFIRMED";
  totalCents: number;
  paidCents: number;
  compact?: boolean;
}

export default function InvoiceStatusBadge({
  status,
  totalCents,
  paidCents,
  compact = false,
}: InvoiceStatusBadgeProps) {
  const paymentState = getInvoicePaymentState({ status, totalCents, paidCents });

  if (paymentState === "draft") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-neutral-200 bg-neutral-100 text-neutral-700 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" aria-hidden="true" />
        <span>مسودة</span>
      </span>
    );
  }

  const paymentChip =
    paymentState === "paid"
      ? {
          label: "مدفوعة بالكامل",
          classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
        }
      : paymentState === "partial"
        ? {
            label: "مدفوعة جزئياً",
            classes: "bg-amber-50 text-amber-800 border-amber-200",
            dot: "bg-amber-500",
          }
        : {
            label: "غير مدفوعة",
            classes: "bg-rose-50 text-[#C8102E] border-rose-200",
            dot: "bg-[#C8102E]",
          };

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-800 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
        <span>معتمدة</span>
      </span>
      {!compact && (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${paymentChip.classes}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${paymentChip.dot}`} aria-hidden="true" />
          <span>{paymentChip.label}</span>
        </span>
      )}
    </div>
  );
}
