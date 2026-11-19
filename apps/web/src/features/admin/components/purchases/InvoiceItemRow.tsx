import { formatEGP } from "@store/shared";
import { useMemo, useState } from "react";
import {
  computeLineTotalCents,
  parseEgpToPiasters,
  parsePositiveQuantity,
  type ProductVariantOption,
  type PurchaseLineDraft,
} from "./purchasesHelpers";

interface InvoiceItemRowProps {
  index: number;
  row: PurchaseLineDraft;
  variants: ProductVariantOption[];
  usedVariantIds: Set<string>;
  canRemove: boolean;
  variantError?: string;
  quantityError?: string;
  costError?: string;
  onChange: (updated: PurchaseLineDraft) => void;
  onRemove: () => void;
}

export default function InvoiceItemRow({
  index,
  row,
  variants,
  usedVariantIds,
  canRemove,
  variantError,
  quantityError,
  costError,
  onChange,
  onRemove,
}: InvoiceItemRowProps) {
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === row.variantId) ?? null,
    [variants, row.variantId],
  );

  const filteredVariants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return variants;
    return variants.filter(
      (v) =>
        v.productName.toLowerCase().includes(q) ||
        v.variantName.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q),
    );
  }, [variants, search]);

  const parsedQty = parsePositiveQuantity(row.quantityInput);
  const parsedCost = row.unitCostInput.trim() === "" ? 0 : parseEgpToPiasters(row.unitCostInput);
  const lineTotalCents = computeLineTotalCents(parsedQty, parsedCost);

  return (
    <div className="rounded-xl border border-neutral-200/90 bg-white p-3.5 space-y-3 transition-colors hover:border-neutral-300">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#101B30]">
          <span className="w-5 h-5 rounded-md bg-[#101B30]/10 text-[#101B30] flex items-center justify-center tabular-nums">
            {index + 1}
          </span>
          <span>بيانات الصنف</span>
        </span>

        <button
          type="button"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label={`حذف الصنف رقم ${index + 1}`}
          className="text-[11px] font-bold text-[#C8102E] hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
        >
          حذف الصنف
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        {/* Product / Variant Selector */}
        <div className="md:col-span-5 min-w-0">
          <label
            htmlFor={`item-variant-${row.key}`}
            className="block text-[11px] font-bold text-neutral-600 mb-1"
          >
            المنتج / المقاس <span className="text-[#C8102E]">*</span>
          </label>

          {selectedVariant ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-2 flex items-center justify-between gap-2 min-h-10">
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#101B30] truncate">
                  {selectedVariant.productName} — {selectedVariant.variantName}
                </div>
                <div className="text-[10px] text-neutral-500 truncate mt-0.5 tabular-nums">
                  SKU: {selectedVariant.sku} • المخزون الحالي: {selectedVariant.stockQuantity}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...row, variantId: "" });
                  setSearch("");
                  setPickerOpen(true);
                }}
                className="px-2 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-bold text-neutral-700 shrink-0"
              >
                تغيير
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                id={`item-variant-${row.key}`}
                type="text"
                value={search}
                onFocus={() => setPickerOpen(true)}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPickerOpen(true);
                }}
                placeholder="ابحث باسم المنتج أو المقاس أو SKU..."
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#C8102E]"
              />

              {pickerOpen && (
                <div className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg divide-y divide-neutral-100">
                  {filteredVariants.length > 0 ? (
                    filteredVariants.map((variant) => {
                      const alreadySelected =
                        usedVariantIds.has(variant.id) && variant.id !== row.variantId;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          disabled={alreadySelected}
                          onClick={() => {
                            onChange({ ...row, variantId: variant.id });
                            setSearch("");
                            setPickerOpen(false);
                          }}
                          className="w-full text-right px-3 py-2 hover:bg-[#FDF2F4]/70 transition-colors flex items-center justify-between gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#101B30] truncate">
                              {variant.productName} — {variant.variantName}
                            </div>
                            <div className="text-[10px] text-neutral-500 truncate tabular-nums">
                              SKU: {variant.sku} • المخزون: {variant.stockQuantity}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold shrink-0 text-[#C8102E]">
                            {alreadySelected ? "مضاف" : "اختيار"}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="p-3 text-center text-xs text-neutral-500">
                      لا توجد منتجات مطابقة للبحث.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {variantError && (
            <p className="mt-1 text-[11px] font-medium text-[#C8102E]">{variantError}</p>
          )}
        </div>

        {/* Quantity */}
        <div className="md:col-span-2">
          <label
            htmlFor={`item-qty-${row.key}`}
            className="block text-[11px] font-bold text-neutral-600 mb-1"
          >
            الكمية <span className="text-[#C8102E]">*</span>
          </label>
          <input
            id={`item-qty-${row.key}`}
            type="number"
            min={1}
            step={1}
            value={row.quantityInput}
            onChange={(event) => onChange({ ...row, quantityInput: event.target.value })}
            aria-label={`الكمية للسطر ${index + 1}`}
            className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-[#101B30] tabular-nums focus:outline-hidden focus:border-[#C8102E]"
          />
          {quantityError && (
            <p className="mt-1 text-[11px] font-medium text-[#C8102E]">{quantityError}</p>
          )}
        </div>

        {/* Unit Purchase Cost */}
        <div className="md:col-span-3">
          <label
            htmlFor={`item-cost-${row.key}`}
            className="block text-[11px] font-bold text-neutral-600 mb-1"
          >
            تكلفة الوحدة (ج.م) <span className="text-[#C8102E]">*</span>
          </label>
          <input
            id={`item-cost-${row.key}`}
            type="number"
            min={0}
            step="0.01"
            value={row.unitCostInput}
            onChange={(event) => onChange({ ...row, unitCostInput: event.target.value })}
            placeholder="0.00"
            aria-label={`تكلفة الوحدة للسطر ${index + 1}`}
            className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-[#101B30] tabular-nums focus:outline-hidden focus:border-[#C8102E]"
          />
          {costError && (
            <p className="mt-1 text-[11px] font-medium text-[#C8102E]">{costError}</p>
          )}
        </div>

        {/* Line Total */}
        <div className="md:col-span-2">
          <span className="block text-[11px] font-bold text-neutral-600 mb-1">إجمالي الصنف</span>
          <div className="h-10 px-3 rounded-xl border border-neutral-200/80 bg-neutral-50 flex items-center text-xs font-extrabold text-[#101B30] tabular-nums">
            {formatEGP(lineTotalCents)}
          </div>
        </div>
      </div>
    </div>
  );
}
