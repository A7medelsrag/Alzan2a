import { useMemo, useState } from "react";
import type { Supplier } from "../../api/operations";

interface SupplierSelectorProps {
  suppliers: Supplier[];
  value: string;
  onChange: (supplierId: string) => void;
  onAddNewSupplier: () => void;
  error?: string;
}

export default function SupplierSelector({
  suppliers,
  value,
  onChange,
  onAddNewSupplier,
  error,
}: SupplierSelectorProps) {
  const [query, setQuery] = useState("");
  const [isListOpen, setIsListOpen] = useState(false);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === value) ?? null,
    [suppliers, value],
  );

  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q) ||
        (s.contactName ?? "").toLowerCase().includes(q) ||
        (s.address ?? "").toLowerCase().includes(q),
    );
  }, [suppliers, query]);

  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="invoice-supplier-search" className="text-xs font-bold text-[#101B30]">
          المورد <span className="text-[#C8102E]">*</span>
        </label>
        <button
          type="button"
          onClick={onAddNewSupplier}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C8102E] hover:text-[#a50d26] transition-colors"
        >
          <span>+ إضافة مورد جديد</span>
        </button>
      </div>

      {/* Selected Supplier Summary */}
      {selectedSupplier ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-[#101B30] truncate">
              {selectedSupplier.name}
            </div>
            {(selectedSupplier.contactName || selectedSupplier.phone) && (
              <div className="text-[11px] text-neutral-600 truncate mt-0.5">
                {[selectedSupplier.contactName, selectedSupplier.phone]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
              setIsListOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-bold text-neutral-700 shrink-0"
          >
            تغيير
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            id="invoice-supplier-search"
            type="text"
            value={query}
            onFocus={() => setIsListOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsListOpen(true);
            }}
            placeholder={
              suppliers.length > 0
                ? "ابحث بالاسم أو الهاتف لاختيار مورد..."
                : "لا يوجد موردون — اضغط + إضافة مورد جديد"
            }
            aria-expanded={isListOpen}
            className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:border-[#C8102E]"
          />

          {isListOpen && (
            <div className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg divide-y divide-neutral-100">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((sup) => (
                  <button
                    key={sup.id}
                    type="button"
                    onClick={() => {
                      onChange(sup.id);
                      setQuery("");
                      setIsListOpen(false);
                    }}
                    className="w-full text-right px-3.5 py-2.5 hover:bg-[#FDF2F4]/70 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#101B30] truncate">{sup.name}</div>
                      {(sup.contactName || sup.phone) && (
                        <div className="text-[11px] text-neutral-500 truncate">
                          {[sup.contactName, sup.phone].filter(Boolean).join(" • ")}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-[#C8102E] shrink-0">
                      اختيار
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-neutral-500 space-y-2">
                  <p>لا يوجد مورد مطابق للبحث.</p>
                  <button
                    type="button"
                    onClick={onAddNewSupplier}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#C8102E] text-white text-[11px] font-bold"
                  >
                    + إضافة مورد جديد
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[11px] font-medium text-[#C8102E]">{error}</p>}
    </div>
  );
}
