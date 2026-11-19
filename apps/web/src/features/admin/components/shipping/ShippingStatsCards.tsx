import {
  formatAverageDays,
  formatShippingPriceEgp,
  type ShippingStatsSummary,
} from "./shippingHelpers";

interface ShippingStatsCardsProps {
  stats: ShippingStatsSummary;
  loading: boolean;
}

export default function ShippingStatsCards({ stats, loading }: ShippingStatsCardsProps) {
  if (loading) {
    return (
      <div
        aria-busy="true"
        aria-label="جارٍ تحميل إحصائيات الشحن"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-2xs animate-pulse flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-xl bg-neutral-200/70 shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-5 w-24 bg-neutral-200 rounded-md" />
              <div className="h-3 w-28 bg-neutral-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "إجمالي المحافظات",
      value: `${stats.totalGovernorates} محافظة`,
      caption: "نطاق التوصيل المسجل",
      cardStyle: "bg-[#EEF2FF]/70 border-indigo-200/70",
      iconBoxStyle: "bg-[#101B30]/10 text-[#101B30]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.373-6-10a6 6 0 1112 0c0 4.627-6 10-6 10z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      ),
    },
    {
      label: "المحافظات المفعلة",
      value: `${stats.enabledCount} مفعل`,
      caption:
        stats.totalGovernorates > 0
          ? `من أصل ${stats.totalGovernorates} • ${stats.disabledCount} غير مفعل`
          : "لا توجد محافظات",
      cardStyle: "bg-[#FFFBEB]/90 border-[#D6A33A]/30",
      iconBoxStyle: "bg-[#D6A33A]/20 text-[#9a6f16]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      label: "أقل سعر توصيل",
      value:
        stats.minPriceCents !== null ? formatShippingPriceEgp(stats.minPriceCents) : "—",
      caption:
        stats.maxPriceCents !== null
          ? `أعلى سعر: ${formatShippingPriceEgp(stats.maxPriceCents)}`
          : "لا توجد أسعار متاحة",
      cardStyle: "bg-[#FDF2F4]/90 border-[#C8102E]/15",
      iconBoxStyle: "bg-[#C8102E]/10 text-[#C8102E]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h11v10H3V6zm11 4h4l3 3v3h-7v-6z" />
          <circle cx="7.5" cy="18" r="2" />
          <circle cx="17.5" cy="18" r="2" />
        </svg>
      ),
    },
    {
      label: "متوسط مدة التوصيل",
      value: formatAverageDays(stats.avgMinDays, stats.avgMaxDays),
      caption:
        stats.enabledCount > 0
          ? "محسوب من المحافظات المفعلة"
          : "محسوب من المحافظات المتاحة",
      cardStyle: "bg-emerald-50/80 border-emerald-200/70",
      iconBoxStyle: "bg-emerald-100 text-emerald-700",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
        </svg>
      ),
    },
  ];

  return (
    <section
      aria-label="ملخص إحصائيات الشحن"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5"
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border ${card.cardStyle} px-4 py-4 shadow-2xs flex items-center gap-3.5 min-w-0 transition-shadow hover:shadow-xs`}
        >
          <div
            className={`w-11 h-11 rounded-xl ${card.iconBoxStyle} flex items-center justify-center shrink-0`}
          >
            {card.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-neutral-600 truncate">
              {card.label}
            </p>
            <p className="text-lg font-black text-[#101B30] mt-0.5 tabular-nums truncate">
              {card.value}
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
              {card.caption}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
