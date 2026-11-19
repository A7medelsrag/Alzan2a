import { Link } from "react-router";

interface PurchasesPageHeaderProps {
  onCreateInvoice: () => void;
  onCreateSupplier: () => void;
  disabled?: boolean;
}

export default function PurchasesPageHeader({
  onCreateInvoice,
  onCreateSupplier,
  disabled = false,
}: PurchasesPageHeaderProps) {
  return (
    <section className="bg-white rounded-2xl border border-neutral-200/80 p-5 md:p-6 shadow-xs">
      <nav
        aria-label="مسار التنقل"
        className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 mb-3"
      >
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 hover:text-[#C8102E] transition-colors font-medium"
        >
          <svg
            className="w-3.5 h-3.5 text-[#C8102E]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span>الرئيسية</span>
        </Link>
        <span aria-hidden="true" className="text-neutral-300">
          /
        </span>
        <span className="font-bold text-[#101B30]">المشتريات</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[#C8102E]/10 text-[#C8102E] flex items-center justify-center shrink-0 mt-0.5">
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
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl md:text-2xl font-black text-[#101B30] tracking-tight">
              المشتريات
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
              إدارة الموردين وفواتير الشراء والمبالغ المستحقة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={onCreateSupplier}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 px-4 py-2.5 text-xs font-bold text-[#101B30] shadow-2xs transition-colors disabled:opacity-50"
          >
            <svg
              className="w-4 h-4 text-[#101B30]/80 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            <span>إضافة مورد</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={onCreateInvoice}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>إضافة فاتورة شراء جديدة</span>
          </button>
        </div>
      </div>
    </section>
  );
}
