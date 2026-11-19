import { add, formatEGP } from "@store/shared";

interface InvoiceFinancialSummaryProps {
  itemsCount: number;
  totalUnits: number;
  subtotalCents: number;
  extraCostsCents: number;
  extraCostsInput: string;
  onExtraCostsChange: (value: string) => void;
  extraCostsError?: string;
}

export default function InvoiceFinancialSummary({
  itemsCount,
  totalUnits,
  subtotalCents,
  extraCostsCents,
  extraCostsInput,
  onExtraCostsChange,
  extraCostsError,
}: InvoiceFinancialSummaryProps) {
  const totalCents = add(subtotalCents, extraCostsCents);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <div>
          <label
            htmlFor="invoice-extra-costs"
            className="block text-xs font-bold text-[#101B30] mb-1.5"
          >
            مصاريف إضافية (شحن / نقل / تخليص) بالجنيه
          </label>
          <input
            id="invoice-extra-costs"
            type="number"
            min={0}
            step="0.01"
            value={extraCostsInput}
            onChange={(event) => onExtraCostsChange(event.target.value)}
            placeholder="0.00"
            className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-[#101B30] tabular-nums focus:outline-hidden focus:border-[#C8102E]"
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            تُوزَّع تلقائياً عند اعتماد الفاتورة على الأصناف لحساب متوسط التكلفة.
          </p>
          {extraCostsError && (
            <p className="mt-1 text-[11px] font-medium text-[#C8102E]">{extraCostsError}</p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-neutral-600">
            <span>إجمالي الأصناف</span>
            <span className="font-bold text-[#101B30] tabular-nums">
              {itemsCount} صنف ({totalUnits} قطعة)
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>قيمة الأصناف</span>
            <span className="font-bold text-[#101B30] tabular-nums">
              {formatEGP(subtotalCents)}
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>المصاريف الإضافية</span>
            <span className="font-bold text-[#101B30] tabular-nums">
              {formatEGP(extraCostsCents)}
            </span>
          </div>
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-sm">
            <span className="font-extrabold text-[#101B30]">إجمالي الفاتورة</span>
            <span className="font-black text-[#101B30] tabular-nums">
              {formatEGP(totalCents)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>المبلغ المدفوع</span>
            <span className="font-bold text-emerald-700 tabular-nums">{formatEGP(0)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>المبلغ المتبقي (بعد الاعتماد)</span>
            <span className="font-bold text-[#C8102E] tabular-nums">{formatEGP(totalCents)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
