import InvoiceItemRow from "./InvoiceItemRow";
import type { ProductVariantOption, PurchaseLineDraft } from "./purchasesHelpers";

interface InvoiceItemsTableProps {
  lines: PurchaseLineDraft[];
  variants: ProductVariantOption[];
  fieldErrors: Record<string, string>;
  onUpdateLine: (key: string, updated: PurchaseLineDraft) => void;
  onRemoveLine: (key: string) => void;
  onAddLine: () => void;
}

export default function InvoiceItemsTable({
  lines,
  variants,
  fieldErrors,
  onUpdateLine,
  onRemoveLine,
  onAddLine,
}: InvoiceItemsTableProps) {
  const usedVariantIds = new Set(lines.map((line) => line.variantId).filter(Boolean));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-extrabold text-[#101B30]">الأصناف المشتراة</h4>
          <p className="text-[11px] text-neutral-500">
            اختر كل منتج ومقاس وأدخل الكمية وسعر الشراء للوحدة الواحدة.
          </p>
        </div>
        <button
          type="button"
          disabled={lines.length >= 100}
          onClick={onAddLine}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#101B30]/20 bg-white hover:bg-neutral-50 text-xs font-bold text-[#101B30] transition-colors disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>إضافة صنف</span>
        </button>
      </div>

      {fieldErrors.lines && (
        <p className="text-[11px] font-medium text-[#C8102E]">{fieldErrors.lines}</p>
      )}

      <div className="space-y-2.5">
        {lines.map((line, index) => (
          <InvoiceItemRow
            key={line.key}
            index={index}
            row={line}
            variants={variants}
            usedVariantIds={usedVariantIds}
            canRemove={lines.length > 1}
            variantError={fieldErrors[`line_${line.key}_variant`]}
            quantityError={fieldErrors[`line_${line.key}_qty`]}
            costError={fieldErrors[`line_${line.key}_cost`]}
            onChange={(updated) => onUpdateLine(line.key, updated)}
            onRemove={() => onRemoveLine(line.key)}
          />
        ))}
      </div>
    </section>
  );
}
