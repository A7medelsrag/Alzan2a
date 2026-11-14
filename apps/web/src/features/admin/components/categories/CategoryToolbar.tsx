export type CategoryHierarchyFilter = "all" | "root" | "sub";
export type CategorySortOption = "name-asc" | "name-desc" | "products-desc" | "products-asc";

interface CategoryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  hierarchyFilter: CategoryHierarchyFilter;
  onHierarchyFilterChange: (value: CategoryHierarchyFilter) => void;
  sortBy: CategorySortOption;
  onSortChange: (value: CategorySortOption) => void;
  onRefresh: () => void;
  refreshing: boolean;
  totalCount: number;
  filteredCount: number;
}

export default function CategoryToolbar({
  search,
  onSearchChange,
  hierarchyFilter,
  onHierarchyFilterChange,
  sortBy,
  onSortChange,
  onRefresh,
  refreshing,
  totalCount,
  filteredCount,
}: CategoryToolbarProps) {
  const filterTabs: Array<{ value: CategoryHierarchyFilter; label: string }> = [
    { value: "all", label: "الكل" },
    { value: "root", label: "الأقسام الرئيسية" },
    { value: "sub", label: "الأقسام الفرعية" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs p-4 space-y-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0 max-w-md">
          <svg
            className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث باسم القسم أو الرابط (slug)..."
            aria-label="بحث في الأقسام"
            className="w-full pr-10 pl-9 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/70 text-xs text-[#101B30] placeholder:text-neutral-400 focus:bg-white focus:outline-hidden focus:border-[#C8102E] focus:ring-2 focus:ring-[#C8102E]/10 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="مسح البحث"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-600 flex items-center justify-center text-[11px] font-bold transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter, Sort & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          {/* Hierarchy Filter Pills */}
          <div className="inline-flex items-center bg-neutral-100/90 p-1 rounded-xl border border-neutral-200/60 max-w-full overflow-x-auto">
            {filterTabs.map((tab) => {
              const active = hierarchyFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onHierarchyFilterChange(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? "bg-[#101B30] text-white shadow-xs"
                      : "text-neutral-600 hover:text-[#101B30]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sort Select */}
          <div className="relative min-w-0">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as CategorySortOption)}
              aria-label="ترتيب الأقسام"
              className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-[#101B30] focus:outline-hidden focus:border-[#C8102E] cursor-pointer"
            >
              <option value="name-asc">الاسم (أ - ي)</option>
              <option value="name-desc">الاسم (ي - أ)</option>
              <option value="products-desc">الأكثر منتجات</option>
              <option value="products-asc">الأقل منتجات</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="تحديث القائمة"
            aria-label="تحديث القائمة"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#C8102E]" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </div>

      {/* Results counter */}
      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
        <span>
          عرض <strong className="text-[#101B30]">{filteredCount.toLocaleString("ar-EG")}</strong> من أصل{" "}
          <strong className="text-[#101B30]">{totalCount.toLocaleString("ar-EG")}</strong> قسم
        </span>
        {(search || hierarchyFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onHierarchyFilterChange("all");
            }}
            className="text-[#C8102E] hover:underline font-semibold"
          >
            إعادة تعيين الفلاتر
          </button>
        )}
      </div>
    </div>
  );
}
