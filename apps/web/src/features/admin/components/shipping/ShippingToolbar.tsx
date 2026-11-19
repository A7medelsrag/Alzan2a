export type ShippingStatusFilter = "all" | "enabled" | "disabled" | "dirty";
export type ShippingPageSize = 10 | 20 | "all";

interface ShippingToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ShippingStatusFilter;
  onStatusFilterChange: (value: ShippingStatusFilter) => void;
  pageSize: ShippingPageSize;
  onPageSizeChange: (value: ShippingPageSize) => void;
  onRefresh: () => void;
  refreshing: boolean;
  totalCount: number;
  enabledCount: number;
  disabledCount: number;
  dirtyCount: number;
}

export default function ShippingToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  pageSize,
  onPageSizeChange,
  onRefresh,
  refreshing,
  totalCount,
  enabledCount,
  disabledCount,
  dirtyCount,
}: ShippingToolbarProps) {
  const filterTabs: Array<{ value: ShippingStatusFilter; label: string; count: number }> = [
    { value: "all", label: "الكل", count: totalCount },
    { value: "enabled", label: "مفعل", count: enabledCount },
    { value: "disabled", label: "غير مفعل", count: disabledCount },
  ];

  if (dirtyCount > 0) {
    filterTabs.push({ value: "dirty", label: "غير محفوظ", count: dirtyCount });
  }

  return (
    <div className="p-4 border-b border-neutral-100 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0 lg:max-w-md">
        <svg
          className="w-4 h-4 text-neutral-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
          />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="البحث في المحافظات..."
          aria-label="البحث في المحافظات"
          className="w-full h-10 ps-10 pe-9 rounded-xl border border-neutral-200 bg-neutral-50/70 text-xs text-[#101B30] placeholder:text-neutral-400 focus:bg-white focus:outline-hidden focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10 transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="مسح البحث"
            className="absolute end-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center text-[11px] font-bold transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filters, Page Size & Refresh */}
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
        <div
          role="group"
          aria-label="تصفية حسب حالة المحافظة"
          className="inline-flex items-center bg-neutral-100/90 p-1 rounded-xl border border-neutral-200/70 max-w-full overflow-x-auto"
        >
          {filterTabs.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onStatusFilterChange(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${
                  active
                    ? "bg-[#101B30] text-white shadow-2xs"
                    : "text-neutral-600 hover:text-[#101B30]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md tabular-nums ${
                    active
                      ? "bg-white/15 text-white"
                      : "bg-neutral-200/70 text-neutral-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <select
          aria-label="عدد المحافظات في الصفحة"
          value={String(pageSize)}
          onChange={(e) => {
            const val = e.target.value;
            onPageSizeChange(val === "all" ? "all" : (Number(val) as 10 | 20));
          }}
          className="h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-[#101B30] focus:outline-hidden focus:border-[#C8102E] cursor-pointer"
        >
          <option value="10">10 / صفحة</option>
          <option value="20">20 / صفحة</option>
          <option value="all">عرض الكل ({totalCount})</option>
        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="تحديث أسعار الشحن"
          className="h-10 inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-[#101B30] shadow-2xs transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? "animate-spin text-[#C8102E]" : "text-neutral-600"}`}
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
  );
}
