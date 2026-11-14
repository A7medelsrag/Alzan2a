import type { AdminCategory } from "../../api/management";

interface CategoryStatsCardsProps {
  categories: AdminCategory[];
  loading: boolean;
}

export default function CategoryStatsCards({ categories, loading }: CategoryStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-neutral-200/70 p-5 shadow-xs animate-pulse flex items-center justify-between gap-4"
          >
            <div className="space-y-2.5 flex-1">
              <div className="h-3 w-24 bg-neutral-200 rounded-md" />
              <div className="h-7 w-14 bg-neutral-200 rounded-md" />
            </div>
            <div className="w-11 h-11 rounded-xl bg-neutral-100 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  const totalCategories = categories.length;
  const rootCategories = categories.filter((c) => !c.parentId).length;
  const subCategories = categories.filter((c) => Boolean(c.parentId)).length;
  const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0);

  const stats = [
    {
      label: "إجمالي الأقسام",
      value: totalCategories,
      accentBorder: "border-r-4 border-r-[#C8102E]",
      iconBg: "bg-[#C8102E]/10 text-[#C8102E]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: "الأقسام الرئيسية",
      value: rootCategories,
      accentBorder: "border-r-4 border-r-[#101B30]",
      iconBg: "bg-[#101B30]/10 text-[#101B30]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      label: "الأقسام الفرعية",
      value: subCategories,
      accentBorder: "border-r-4 border-r-[#D6A33A]",
      iconBg: "bg-[#D6A33A]/15 text-[#9a6f16]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      label: "المنتجات المصنفة",
      value: totalProducts,
      accentBorder: "border-r-4 border-r-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-700",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`bg-white rounded-2xl border border-neutral-200/80 ${stat.accentBorder} p-5 shadow-xs flex items-center justify-between gap-4 min-w-0 transition-shadow hover:shadow-sm`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-neutral-500 truncate">{stat.label}</p>
            <p className="text-2xl font-black text-[#101B30] mt-1 tabular-nums">
              {stat.value.toLocaleString("ar-EG")}
            </p>
          </div>
          <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center shrink-0`}>
            {stat.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
