import { formatEGP } from "@store/shared";
import PurchaseStatisticsCard from "./PurchaseStatisticsCard";
import type { PurchaseStatsSummary } from "./purchasesHelpers";

interface PurchaseStatisticsCardsProps {
  stats: PurchaseStatsSummary;
  loading: boolean;
}

export default function PurchaseStatisticsCards({
  stats,
  loading,
}: PurchaseStatisticsCardsProps) {
  if (loading) {
    return (
      <div
        aria-busy="true"
        aria-label="جارٍ تحميل إحصائيات المشتريات"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-2xs animate-pulse flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-xl bg-neutral-200/75 shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-3 w-24 bg-neutral-200 rounded-md" />
              <div className="h-5 w-28 bg-neutral-200 rounded-md" />
              <div className="h-2.5 w-20 bg-neutral-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label="ملخص إحصائيات المشتريات"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5"
    >
      <PurchaseStatisticsCard
        tone="gold"
        label="إجمالي المشتريات"
        value={formatEGP(stats.totalPurchasesCents)}
        hint={
          stats.confirmedCount > 0
            ? `من ${stats.confirmedCount} فاتورة معتمدة`
            : "تشمل الفواتير المعتمدة فقط"
        }
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.9}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        }
      />

      <PurchaseStatisticsCard
        tone="burgundy"
        label="إجمالي الموردين"
        value={stats.totalSuppliersCount}
        hint={stats.totalSuppliersCount > 0 ? "موردون نشطون مسجلون" : "لا يوجد موردون بعد"}
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.9}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        }
      />

      <PurchaseStatisticsCard
        tone="emerald"
        label="إجمالي الفواتير"
        value={stats.totalInvoicesCount}
        hint={
          stats.totalInvoicesCount > 0
            ? `${stats.confirmedCount} معتمدة • ${stats.draftCount} مسودة`
            : "لا توجد فواتير مسجلة"
        }
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.9}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
      />

      <PurchaseStatisticsCard
        tone="navy"
        label="إجمالي المبالغ المستحقة"
        value={formatEGP(stats.totalOutstandingCents)}
        hint={`المدفوع: ${formatEGP(stats.totalPaidCents)}`}
        icon={
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.9}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        }
      />
    </section>
  );
}
