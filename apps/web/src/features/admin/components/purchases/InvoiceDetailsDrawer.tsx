import { formatEGP } from "@store/shared";
import type { PurchaseInvoice } from "../../api/operations";
import DrawerModal from "../promotions/DrawerModal";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import {
  formatPaymentMethodLabel,
  formatPurchaseDate,
  getInvoiceDisplayNumber,
  getInvoiceRemainingCents,
} from "./purchasesHelpers";

interface InvoiceDetailsDrawerProps {
  invoice: PurchaseInvoice | null;
  busy: boolean;
  onClose: () => void;
  onRequestConfirm: (invoice: PurchaseInvoice) => void;
  onOpenPayment: (invoice: PurchaseInvoice) => void;
}

export default function InvoiceDetailsDrawer({
  invoice,
  busy,
  onClose,
  onRequestConfirm,
  onOpenPayment,
}: InvoiceDetailsDrawerProps) {
  if (!invoice) return null;

  const remainingCents = getInvoiceRemainingCents(invoice);
  const canApprove = invoice.status === "DRAFT";
  const canPay = invoice.status === "CONFIRMED" && remainingCents > 0;
  const computedSubtotalCents =
    invoice.subtotalCents ??
    invoice.lines.reduce(
      (sum, line) => sum + (line.lineTotalCents ?? line.quantity * (line.unitCostCents ?? 0)),
      0,
    );
  const extraCostsCents = invoice.extraCostsCents ?? 0;
  const payments = invoice.payments ?? [];

  return (
    <DrawerModal
      open={Boolean(invoice)}
      onClose={onClose}
      title={`تفاصيل فاتورة الشراء ${getInvoiceDisplayNumber(invoice)}`}
      subtitle={`المورد: ${invoice.supplier.name} • بتاريخ ${formatPurchaseDate(invoice.invoiceDate ?? invoice.createdAt)}`}
      maxWidthClass="max-w-4xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors"
          >
            إغلاق
          </button>

          {canApprove && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRequestConfirm(invoice)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
            >
              اعتماد وإضافة للمخزون
            </button>
          )}

          {canPay && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onOpenPayment(invoice)}
              className="px-5 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
            >
              تسجيل دفعة
            </button>
          )}
        </>
      }
    >
      {/* Lifecycle Status Banner */}
      <div
        className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          invoice.status === "CONFIRMED"
            ? "bg-emerald-50/70 border-emerald-200"
            : "bg-amber-50/70 border-amber-200"
        }`}
      >
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge
              status={invoice.status}
              totalCents={invoice.totalCents}
              paidCents={invoice.paidCents}
            />
          </div>
          <p className="text-xs text-neutral-700 leading-relaxed">
            {invoice.status === "DRAFT"
              ? "هذه الفاتورة محفوظة كمسودة فقط — لم تُضف الكميات للمخزون ولم يتأثر متوسط التكلفة بعد."
              : `تم اعتماد الفاتورة وإضافة الكميات للمخزون${
                  invoice.confirmedAt ? ` بتاريخ ${formatPurchaseDate(invoice.confirmedAt, true)}` : ""
                }.`}
          </p>
        </div>

        <div className="text-right sm:text-left shrink-0">
          <span className="block text-[11px] text-neutral-500">إجمالي الفاتورة</span>
          <span className="text-lg font-black text-[#101B30] tabular-nums">
            {formatEGP(invoice.totalCents)}
          </span>
        </div>
      </div>

      {/* Invoice & Supplier Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-neutral-200/90 bg-white p-4 space-y-2.5 text-xs">
          <h4 className="font-extrabold text-[#101B30] border-b border-neutral-100 pb-2">
            معلومات الفاتورة
          </h4>
          <div className="flex items-center justify-between gap-2">
            <span className="text-neutral-500">رقم الفاتورة</span>
            <span className="font-bold text-[#101B30] tabular-nums">
              {getInvoiceDisplayNumber(invoice)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-neutral-500">تاريخ الفاتورة</span>
            <span className="font-semibold text-neutral-800">
              {formatPurchaseDate(invoice.invoiceDate ?? invoice.createdAt)}
            </span>
          </div>
          {invoice.createdAt && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">تاريخ التسجيل</span>
              <span className="font-semibold text-neutral-800">
                {formatPurchaseDate(invoice.createdAt, true)}
              </span>
            </div>
          )}
          {invoice.confirmedAt && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">تاريخ الاعتماد</span>
              <span className="font-semibold text-emerald-700">
                {formatPurchaseDate(invoice.confirmedAt, true)}
              </span>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200/90 bg-white p-4 space-y-2.5 text-xs">
          <h4 className="font-extrabold text-[#101B30] border-b border-neutral-100 pb-2">
            بيانات المورد
          </h4>
          <div className="flex items-center justify-between gap-2">
            <span className="text-neutral-500">الاسم</span>
            <span className="font-bold text-[#101B30]">{invoice.supplier.name}</span>
          </div>
          {invoice.supplier.contactName && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">جهة الاتصال</span>
              <span className="font-semibold text-neutral-800">
                {invoice.supplier.contactName}
              </span>
            </div>
          )}
          {invoice.supplier.phone && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">الهاتف</span>
              <span className="font-semibold text-neutral-800 tabular-nums" dir="ltr">
                {invoice.supplier.phone}
              </span>
            </div>
          )}
          {invoice.supplier.email && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-500">البريد الإلكتروني</span>
              <span className="font-semibold text-neutral-800" dir="ltr">
                {invoice.supplier.email}
              </span>
            </div>
          )}
          {invoice.supplier.address && (
            <div className="flex items-start justify-between gap-3">
              <span className="text-neutral-500 shrink-0">العنوان</span>
              <span className="font-semibold text-neutral-800 text-left">
                {invoice.supplier.address}
              </span>
            </div>
          )}
        </section>
      </div>

      {/* Purchased Items */}
      <section className="rounded-2xl border border-neutral-200/90 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-[#101B30]">الأصناف المشتراة</h4>
          <span className="text-[11px] font-bold text-neutral-500 tabular-nums">
            {invoice.lines.length} صنف
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start text-xs">
            <thead>
              <tr className="bg-[#101B30] text-white">
                <th className="px-3.5 py-2.5 font-bold text-start">المنتج</th>
                <th className="px-3.5 py-2.5 font-bold text-start">المقاس / النوع</th>
                <th className="px-3.5 py-2.5 font-bold text-center">الكمية</th>
                <th className="px-3.5 py-2.5 font-bold text-start">تكلفة الوحدة</th>
                {invoice.status === "CONFIRMED" && (
                  <th className="px-3.5 py-2.5 font-bold text-start">مصاريف موزعة</th>
                )}
                <th className="px-3.5 py-2.5 font-bold text-start">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {invoice.lines.map((line) => {
                const unitCostCents = line.unitCostCents ?? 0;
                const lineTotalCents = line.lineTotalCents ?? line.quantity * unitCostCents;
                return (
                  <tr key={line.id} className="hover:bg-neutral-50/70">
                    <td className="px-3.5 py-2.5 font-bold text-[#101B30]">
                      {line.variant.product.name}
                    </td>
                    <td className="px-3.5 py-2.5 text-neutral-700">
                      <span>{line.variant.name}</span>
                      {line.variant.sku && (
                        <span className="block text-[10px] text-neutral-400 tabular-nums">
                          SKU: {line.variant.sku}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-bold text-[#101B30] tabular-nums">
                      {line.quantity}
                    </td>
                    <td className="px-3.5 py-2.5 tabular-nums text-neutral-800">
                      {formatEGP(unitCostCents)}
                    </td>
                    {invoice.status === "CONFIRMED" && (
                      <td className="px-3.5 py-2.5 tabular-nums text-neutral-600">
                        {formatEGP(line.allocatedExtraCostCents ?? 0)}
                      </td>
                    )}
                    <td className="px-3.5 py-2.5 font-extrabold text-[#101B30] tabular-nums">
                      {formatEGP(lineTotalCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Financial Summary + Payments History */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <section className="md:col-span-5 rounded-2xl border border-neutral-200/90 bg-neutral-50/60 p-4 space-y-2.5 text-xs">
          <h4 className="font-extrabold text-[#101B30] border-b border-neutral-200/80 pb-2">
            الملخص المالي
          </h4>
          <div className="flex items-center justify-between text-neutral-600">
            <span>قيمة الأصناف</span>
            <span className="font-bold text-[#101B30] tabular-nums">
              {formatEGP(computedSubtotalCents)}
            </span>
          </div>
          <div className="flex items-center justify-between text-neutral-600">
            <span>مصاريف إضافية</span>
            <span className="font-bold text-[#101B30] tabular-nums">
              {formatEGP(extraCostsCents)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/80 text-sm">
            <span className="font-extrabold text-[#101B30]">الإجمالي الكلي</span>
            <span className="font-black text-[#101B30] tabular-nums">
              {formatEGP(invoice.totalCents)}
            </span>
          </div>
          <div className="flex items-center justify-between text-emerald-700">
            <span className="font-semibold">إجمالي المدفوع</span>
            <span className="font-extrabold tabular-nums">{formatEGP(invoice.paidCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-600">المبلغ المتبقي</span>
            <span
              className={`font-black tabular-nums ${
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
        </section>

        <section className="md:col-span-7 rounded-2xl border border-neutral-200/90 bg-white p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <h4 className="font-extrabold text-[#101B30]">سجل المدفوعات</h4>
            <span className="text-[11px] font-bold text-neutral-500 tabular-nums">
              {payments.length} دفعة
            </span>
          </div>

          {payments.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {payments.map((payment) => (
                <div key={payment.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-[#101B30]">
                      {formatPaymentMethodLabel(payment.method)}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {formatPurchaseDate(payment.paidAt)}
                      {payment.reference ? ` • مرجع: ${payment.reference}` : ""}
                    </div>
                  </div>
                  <span className="font-extrabold text-emerald-700 tabular-nums shrink-0">
                    {formatEGP(payment.amountCents)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 py-3">
              {invoice.status === "DRAFT"
                ? "يمكن تسجيل الدفعات بعد اعتماد الفاتورة."
                : "لم يتم تسجيل أي دفعات لهذه الفاتورة حتى الآن."}
            </p>
          )}
        </section>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <section className="rounded-2xl border border-neutral-200/90 bg-white p-4 space-y-1.5 text-xs">
          <h4 className="font-extrabold text-[#101B30]">ملاحظات</h4>
          <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
        </section>
      )}
    </DrawerModal>
  );
}
