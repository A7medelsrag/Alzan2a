import type { Supplier } from "../../api/operations";
import type {
  PurchasePageSize,
  PurchaseSortOption,
  PurchaseStatusFilter,
} from "./purchasesHelpers";

interface PurchasesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: PurchaseStatusFilter;
  onStatusFilterChange: (value: PurchaseStatusFilter) => void;
  supplierFilter: string;
  onSupplierFilterChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  sortBy: PurchaseSortOption;
  onSortChange: (value: PurchaseSortOption) => void;
  pageSize: PurchasePageSize;
  onPageSizeChange: (value: PurchasePageSize) => void;
  suppliers: Supplier[];
  onRefresh: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  refreshing: boolean;
  filteredCount: number;
  totalCount: number;
}

export default function PurchasesToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  supplierFilter,
  onSupplierFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sortBy,
  onSortChange,
  pageSize,
  onPageSizeChange,
  suppliers,
  onRefresh,
  onResetFilters,
  hasActiveFilters,
  refreshing,
  filteredCount,
  totalCount,
}: PurchasesToolbarProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3 min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <svg
            className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="ابحث برقم الفاتورة، اسم المورد، أو اسم المنتج / SKU..."
            aria-label="البحث في فواتير الشراء"
            className="w-full h-10 pr-10 pl-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-hidden focus:border-[#C8102E] transition-colors"
          />
        </div>

        {/* Status, Supplier & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value as PurchaseStatusFilter)}
            aria-label="تصفية حسب الحالة"
            className="h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-700 focus:outline-hidden focus:border-[#C8102E] min-w-[135px] flex-1 sm:flex-none"
          >
            <option value="ALL">كل الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="CONFIRMED">معتمدة (الكل)</option>
            <option value="CONFIRMED_UNPAID">مستحقة الدفع</option>
            <option value="CONFIRMED_PARTIAL">مدفوعة جزئياً</option>
            <option value="CONFIRMED_PAID">مدفوعة بالكامل</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(event) => onSupplierFilterChange(event.target.value)}
            aria-label="تصفية حسب المورد"
            className="h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-700 focus:outline-hidden focus:border-[#C8102E] min-w-[145px] max-w-full flex-1 sm:flex-none"
          >
            <option value="ALL">كل الموردين</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as PurchaseSortOption)}
            aria-label="ترتيب الفواتير"
            className="h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-700 focus:outline-hidden focus:border-[#C8102E] min-w-[135px] flex-1 sm:flex-none"
          >
            <option value="date_desc">الأحدث تاريخاً</option>
            <option value="date_asc">الأقدم تاريخاً</option>
            <option value="total_desc">الأعلى إجمالياً</option>
            <option value="total_asc">الأقل إجمالياً</option>
            <option value="remaining_desc">الأعلى متبقياً</option>
          </select>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="تحديث البيانات"
            className="h-10 px-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#C8102E]" : "text-neutral-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Second Row: Date Range, Page Size & Result Counter */}
      <div className="pt-2.5 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] text-neutral-500">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-neutral-600">من:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => onDateFromChange(event.target.value)}
              aria-label="تصفية من تاريخ"
              className="h-8 px-2.5 rounded-lg border border-neutral-200 bg-neutral-50/70 text-[11px] text-neutral-800 focus:bg-white focus:outline-hidden focus:border-[#C8102E]"
            />
          </label>
          <label className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-neutral-600">إلى:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => onDateToChange(event.target.value)}
              aria-label="تصفية إلى تاريخ"
              className="h-8 px-2.5 rounded-lg border border-neutral-200 bg-neutral-50/70 text-[11px] text-neutral-800 focus:bg-white focus:outline-hidden focus:border-[#C8102E]"
            />
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50/80 text-[#C8102E] hover:bg-rose-100/80 font-bold transition-colors"
            >
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
          <span>
            عرض{" "}
            <strong className="text-[#101B30] tabular-nums">{filteredCount}</strong> من أصل{" "}
            <strong className="text-[#101B30] tabular-nums">{totalCount}</strong> فاتورة
          </span>

          <select
            value={pageSize}
            onChange={(event) => {
              const val = event.target.value;
              onPageSizeChange(val === "ALL" ? "ALL" : (Number(val) as PurchasePageSize));
            }}
            aria-label="عدد الفواتير في الصفحة"
            className="h-8 px-2.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-medium text-neutral-700 focus:outline-hidden focus:border-[#C8102E]"
          >
            <option value={10}>10 فواتير</option>
            <option value={25}>25 فاتورة</option>
            <option value={50}>50 فاتورة</option>
            <option value="ALL">الكل</option>
          </select>
        </div>
      </div>
    </div>
  );
}
