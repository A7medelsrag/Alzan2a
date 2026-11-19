import { formatEGP } from "@store/shared";
import type { PurchaseInvoice } from "../../api/operations";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import {
  formatPurchaseDate,
  getInvoiceDisplayNumber,
  getInvoiceItemsSummary,
  getInvoiceRemainingCents,
} from "./purchasesHelpers";

interface PurchaseInvoicesTableProps {
  invoices: PurchaseInvoice[];
  totalFilteredCount: number;
  currentPage: number;
  totalPages: number;
  pageStartIndex: number;
  pageEndIndex: number;
  busy: boolean;
  onPageChange: (page: number) => void;
  onViewDetails: (invoice: PurchaseInvoice) => void;
  onRequestConfirm: (invoice: PurchaseInvoice) => void;
  onOpenPayment: (invoice: PurchaseInvoice) => void;
}

function buildPageNumbers(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);
  if (left > 2) pages.push("ellipsis");
  for (let p = left; p <= right; p += 1) pages.push(p);
  if (right < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export default function PurchaseInvoicesTable({
  invoices,
  totalFilteredCount,
  currentPage,
  totalPages,
  pageStartIndex,
  pageEndIndex,
  busy,
  onPageChange,
  onViewDetails,
  onRequestConfirm,
  onOpenPayment,
}: PurchaseInvoicesTableProps) {
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <section className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden min-w-0">
      {/* Desktop & Tablet Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-start text-xs">
          <thead>
            <tr className="bg-[#101B30] text-white">
              <th scope="col" className="px-4 py-3.5 font-bold whitespace-nowrap text-start">
                رقم الفاتورة
              </th>
              <th scope="col" className="px-3.5 py-3.5 font-bold whitespace-nowrap text-start">
                المورد
              </th>
              <th scope="col" className="px-3.5 py-3.5 font-bold whitespace-nowrap text-start">
                الأصناف
              </th>
              <th scope="col" className="px-3.5 py-3.5 font-bold whitespace-nowrap text-start">
                الإجمالي
              </th>
              <th scope="col" className="px-3.5 py-3.5 font-bold whitespace-nowrap text-start">
                المدفوع
              </th>
              <th scope="col" className="px-3.5 py-3.5 font-bold whitespace-nowrap text-start">
                المتبقي
              </th>
              <th scope="col" className="px-3.5 py-3.5 font-bold whitespace-nowrap text-center">
                الحالة
              </th>
              <th scope="col" className="px-4 py-3.5 font-bold whitespace-nowrap text-center">
                الإجراءات
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-100">
            {invoices.map((invoice) => {
              const remainingCents = getInvoiceRemainingCents(invoice);
              const { itemsCount, unitsCount, previewText } = getInvoiceItemsSummary(invoice);
              const canApprove = invoice.status === "DRAFT";
              const canPay = invoice.status === "CONFIRMED" && remainingCents > 0;

              return (
                <tr
                  key={invoice.id}
                  className="bg-white hover:bg-neutral-50/90 transition-colors align-middle"
                >
                  {/* 1. Invoice Number & Date */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="font-extrabold text-[#101B30] tabular-nums">
                      {getInvoiceDisplayNumber(invoice)}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {formatPurchaseDate(invoice.invoiceDate ?? invoice.createdAt)}
                    </div>
                  </td>

                  {/* 2. Supplier */}
                  <td className="px-3.5 py-3.5 min-w-[140px] max-w-[200px]">
                    <div className="font-bold text-neutral-900 truncate" title={invoice.supplier.name}>
                      {invoice.supplier.name}
                    </div>
                    {(invoice.supplier.phone || invoice.supplier.contactName) && (
                      <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {invoice.supplier.phone || invoice.supplier.contactName}
                      </div>
                    )}
                  </td>

                  {/* 3. Items Summary */}
                  <td className="px-3.5 py-3.5 min-w-[180px] max-w-[260px]">
                    <div className="inline-flex items-center gap-1.5 font-semibold text-[#101B30]">
                      <span>{itemsCount} صنف</span>
                      <span className="text-neutral-300">•</span>
                      <span className="text-neutral-600 tabular-nums">{unitsCount} قطعة</span>
                    </div>
                    {previewText && (
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5" title={previewText}>
                        {previewText}
                      </p>
                    )}
                  </td>

                  {/* 4. Total */}
                  <td className="px-3.5 py-3.5 whitespace-nowrap">
                    <div className="font-extrabold text-[#101B30] tabular-nums">
                      {formatEGP(invoice.totalCents)}
                    </div>
                    {(invoice.extraCostsCents ?? 0) > 0 && (
                      <div className="text-[10px] text-neutral-500 mt-0.5 tabular-nums">
                        شامل مصاريف {formatEGP(invoice.extraCostsCents ?? 0)}
                      </div>
                    )}
                  </td>

                  {/* 5. Paid */}
                  <td className="px-3.5 py-3.5 whitespace-nowrap">
                    <span
                      className={`font-bold tabular-nums ${
                        invoice.paidCents > 0 ? "text-emerald-700" : "text-neutral-500"
                      }`}
                    >
                      {formatEGP(invoice.paidCents)}
                    </span>
                  </td>

                  {/* 6. Remaining */}
                  <td className="px-3.5 py-3.5 whitespace-nowrap">
                    {invoice.status === "DRAFT" ? (
                      <span className="text-neutral-400 font-medium" title="تستحق بعد الاعتماد">
                        —
                      </span>
                    ) : (
                      <span
                        className={`font-extrabold tabular-nums ${
                          remainingCents > 0 ? "text-[#C8102E]" : "text-emerald-700"
                        }`}
                      >
                        {formatEGP(remainingCents)}
                      </span>
                    )}
                  </td>

                  {/* 7. Status */}
                  <td className="px-3.5 py-3.5 text-center">
                    <div className="flex justify-center">
                      <InvoiceStatusBadge
                        status={invoice.status}
                        totalCents={invoice.totalCents}
                        paidCents={invoice.paidCents}
                      />
                    </div>
                  </td>

                  {/* 8. Actions */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewDetails(invoice)}
                        className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-bold text-[#101B30] transition-colors"
                      >
                        عرض التفاصيل
                      </button>

                      {canApprove && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onRequestConfirm(invoice)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white shadow-2xs transition-colors disabled:opacity-50"
                        >
                          اعتماد الفاتورة
                        </button>
                      )}

                      {canPay && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onOpenPayment(invoice)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#101B30] hover:bg-[#1a2b4c] text-[11px] font-bold text-white shadow-2xs transition-colors disabled:opacity-50"
                        >
                          تسجيل دفعة
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-neutral-100">
        {invoices.map((invoice) => {
          const remainingCents = getInvoiceRemainingCents(invoice);
          const { itemsCount, unitsCount, previewText } = getInvoiceItemsSummary(invoice);
          const canApprove = invoice.status === "DRAFT";
          const canPay = invoice.status === "CONFIRMED" && remainingCents > 0;

          return (
            <article key={invoice.id} className="p-4 space-y-3 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-[#101B30] tabular-nums">
                    {getInvoiceDisplayNumber(invoice)}
                  </div>
                  <div className="text-xs font-bold text-neutral-800 truncate mt-0.5">
                    {invoice.supplier.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {formatPurchaseDate(invoice.invoiceDate ?? invoice.createdAt)} • {itemsCount} صنف ({unitsCount} قطعة)
                  </div>
                </div>
                <InvoiceStatusBadge
                  status={invoice.status}
                  totalCents={invoice.totalCents}
                  paidCents={invoice.paidCents}
                />
              </div>

              {previewText && (
                <p className="text-[11px] text-neutral-600 bg-neutral-50 rounded-xl px-3 py-2 border border-neutral-100 truncate">
                  {previewText}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-50/80 border border-neutral-100 p-2.5 text-center">
                <div className="min-w-0">
                  <span className="block text-[10px] text-neutral-500">الإجمالي</span>
                  <span className="block text-xs font-extrabold text-[#101B30] tabular-nums mt-0.5">
                    {formatEGP(invoice.totalCents)}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-neutral-500">المدفوع</span>
                  <span className="block text-xs font-bold text-emerald-700 tabular-nums mt-0.5">
                    {formatEGP(invoice.paidCents)}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-neutral-500">المتبقي</span>
                  <span
                    className={`block text-xs font-extrabold tabular-nums mt-0.5 ${
                      invoice.status === "DRAFT"
                        ? "text-neutral-400"
                        : remainingCents > 0
                          ? "text-[#C8102E]"
                          : "text-emerald-700"
                    }`}
                  >
                    {invoice.status === "DRAFT" ? "—" : formatEGP(remainingCents)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onViewDetails(invoice)}
                  className="flex-1 py-2 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-[#101B30]"
                >
                  عرض التفاصيل
                </button>
                {canApprove && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRequestConfirm(invoice)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white disabled:opacity-50"
                  >
                    اعتماد الفاتورة
                  </button>
                )}
                {canPay && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onOpenPayment(invoice)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#101B30] hover:bg-[#1a2b4c] text-xs font-bold text-white disabled:opacity-50"
                  >
                    تسجيل دفعة
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-600">
          <span className="tabular-nums">
            عرض <strong className="text-[#101B30]">{pageStartIndex + 1}</strong> إلى{" "}
            <strong className="text-[#101B30]">{pageEndIndex}</strong> من{" "}
            <strong className="text-[#101B30]">{totalFilteredCount}</strong>
          </span>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 font-semibold disabled:opacity-40"
            >
              السابق
            </button>

            {pageNumbers.map((page, idx) =>
              page === "ellipsis" ? (
                <span key={`e-${idx}`} className="px-2 text-neutral-400">
                  …
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={`min-w-8 h-8 px-2 rounded-lg font-bold tabular-nums transition-colors ${
                    page === currentPage
                      ? "bg-[#101B30] text-white"
                      : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {page}
                </button>
              ),
            )}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 font-semibold disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
