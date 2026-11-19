import { formatEGP } from "@store/shared";
import { useEffect, useState, type FormEvent } from "react";
import {
  operationsApi,
  type PurchaseInvoice,
  type PurchasePaymentMethod,
} from "../../api/operations";
import DrawerModal from "../promotions/DrawerModal";
import {
  formatPiastersToInput,
  formatPurchaseApiError,
  getInvoiceDisplayNumber,
  getInvoiceRemainingCents,
  toDateInputValue,
  validatePaymentDraft,
} from "./purchasesHelpers";

interface PurchasePaymentModalProps {
  invoice: PurchaseInvoice | null;
  onClose: () => void;
  onRecorded: () => Promise<void> | void;
}

export default function PurchasePaymentModal({
  invoice,
  onClose,
  onRecorded,
}: PurchasePaymentModalProps) {
  const [amountInput, setAmountInput] = useState("");
  const [method, setMethod] = useState<PurchasePaymentMethod>("CASH");
  const [paidAt, setPaidAt] = useState(() => toDateInputValue());
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const remainingCents = invoice ? getInvoiceRemainingCents(invoice) : 0;

  useEffect(() => {
    if (invoice) {
      setAmountInput(formatPiastersToInput(getInvoiceRemainingCents(invoice)));
      setMethod("CASH");
      setPaidAt(toDateInputValue());
      setReference("");
      setError("");
      setSubmitting(false);
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setError("");
    const validation = validatePaymentDraft(
      { amountInput, method, paidAt, reference },
      remainingCents,
    );
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setSubmitting(true);
    try {
      await operationsApi.payPurchase(invoice.id, validation.payload);
      await onRecorded();
      onClose();
    } catch (err) {
      setError(formatPurchaseApiError(err, "تعذر تسجيل الدفعة."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerModal
      open={Boolean(invoice)}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={`تسجيل دفعة — فاتورة ${getInvoiceDisplayNumber(invoice)}`}
      subtitle={`المورد: ${invoice.supplier.name}`}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="purchase-payment-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
          >
            {submitting && (
              <span
                className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                aria-hidden="true"
              />
            )}
            <span>{submitting ? "جارٍ التسجيل..." : "تسجيل الدفعة"}</span>
          </button>
        </>
      }
    >
      <form id="purchase-payment-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-neutral-50 border border-neutral-200/80 p-3 text-center text-xs">
          <div>
            <span className="block text-[10px] text-neutral-500">الإجمالي</span>
            <strong className="text-[#101B30] tabular-nums">{formatEGP(invoice.totalCents)}</strong>
          </div>
          <div>
            <span className="block text-[10px] text-neutral-500">المدفوع</span>
            <strong className="text-emerald-700 tabular-nums">{formatEGP(invoice.paidCents)}</strong>
          </div>
          <div>
            <span className="block text-[10px] text-neutral-500">المتبقي</span>
            <strong className="text-[#C8102E] tabular-nums">{formatEGP(remainingCents)}</strong>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
          >
            {error}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="payment-amount" className="text-xs font-bold text-[#101B30]">
              المبلغ المدفوع (ج.م) <span className="text-[#C8102E]">*</span>
            </label>
            <button
              type="button"
              onClick={() => setAmountInput(formatPiastersToInput(remainingCents))}
              className="text-[11px] font-bold text-[#C8102E] hover:text-[#a50d26]"
            >
              سداد المتبقي بالكامل ({formatEGP(remainingCents)})
            </button>
          </div>
          <input
            id="payment-amount"
            type="number"
            required
            min={0.01}
            step="0.01"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-[#101B30] tabular-nums focus:outline-hidden focus:border-[#C8102E]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="payment-method" className="block text-xs font-bold text-[#101B30] mb-1.5">
              طريقة الدفع
            </label>
            <select
              id="payment-method"
              value={method}
              onChange={(event) => setMethod(event.target.value as PurchasePaymentMethod)}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-[#101B30] focus:outline-hidden focus:border-[#C8102E]"
            >
              <option value="CASH">نقدي (كاش)</option>
              <option value="BANK_TRANSFER">تحويل بنكي</option>
              <option value="CHECK">شيك</option>
              <option value="OTHER">وسيلة أخرى</option>
            </select>
          </div>

          <div>
            <label htmlFor="payment-date" className="block text-xs font-bold text-[#101B30] mb-1.5">
              تاريخ الدفع
            </label>
            <input
              id="payment-date"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs text-[#101B30] focus:outline-hidden focus:border-[#C8102E]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="payment-reference" className="block text-xs font-bold text-[#101B30] mb-1.5">
            رقم المرجع / الإيصال (اختياري)
          </label>
          <input
            id="payment-reference"
            type="text"
            maxLength={150}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="مثال: رقم التحويل البنكي أو الشيك"
            className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
          />
        </div>
      </form>
    </DrawerModal>
  );
}
