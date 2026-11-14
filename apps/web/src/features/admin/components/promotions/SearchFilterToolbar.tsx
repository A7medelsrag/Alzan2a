export interface FilterOption {
  value: string;
  label: string;
}

interface SearchFilterToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions: FilterOption[];
  typeFilter?: string;
  onTypeFilterChange?: (value: string) => void;
  typeOptions?: FilterOption[];
  sortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: FilterOption[];
  onRefresh: () => void;
  refreshing?: boolean;
  resultCount?: number;
}

export default function SearchFilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  typeFilter,
  onTypeFilterChange,
  typeOptions,
  sortValue,
  onSortChange,
  sortOptions,
  onRefresh,
  refreshing = false,
  resultCount,
}: SearchFilterToolbarProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-3">
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
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full h-10 pr-10 pl-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-hidden focus:border-[#C8102E] transition-colors"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="تصفية حسب الحالة"
            className="h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-700 focus:outline-hidden focus:border-[#C8102E] min-w-[130px] flex-1 sm:flex-none"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {typeOptions && onTypeFilterChange && (
            <select
              value={typeFilter ?? "ALL"}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              aria-label="تصفية حسب النوع"
              className="h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-700 focus:outline-hidden focus:border-[#C8102E] min-w-[140px] flex-1 sm:flex-none"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          <select
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="الترتيب"
            className="h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-700 focus:outline-hidden focus:border-[#C8102E] min-w-[145px] flex-1 sm:flex-none"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="تحديث البيانات"
            className="h-10 px-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {typeof resultCount === "number" && (
        <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
          <span>عدد النتائج المعروضة: <strong className="text-[#101B30]">{resultCount}</strong></span>
          {(searchValue || statusFilter !== "ALL" || (typeFilter && typeFilter !== "ALL")) && (
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                onStatusFilterChange("ALL");
                onTypeFilterChange?.("ALL");
              }}
              className="text-[#C8102E] hover:underline font-semibold"
            >
              إعادة تعيين الفلاتر
            </button>
          )}
        </div>
      )}
    </div>
  );
}
