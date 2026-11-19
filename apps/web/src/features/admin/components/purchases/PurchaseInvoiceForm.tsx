import { add, formatEGP } from "@store/shared";
import { useEffect, useMemo, useState } from "react";
import { operationsApi, type PurchaseInvoice, type Supplier } from "../../api/operations";
import DrawerModal from "../promotions/DrawerModal";
import ConfirmationDialog from "./ConfirmationDialog";
import InvoiceFinancialSummary from "./InvoiceFinancialSummary";
import InvoiceItemsTable from "./InvoiceItemsTable";
import SupplierSelector from "./SupplierSelector";
import {
  computeLineTotalCents,
  formatPurchaseApiError,
  parseEgpToPiasters,
  parsePositiveQuantity,
  toDateInputValue,
  validatePurchaseInvoiceDraft,
  type ProductVariantOption,
  type PurchaseLineDraft,
} from "./purchasesHelpers";

interface PurchaseInvoiceFormProps {
  open: boolean;
  suppliers: Supplier[];
  variants: ProductVariantOption[];
  selectedSupplierIdOverride?: string;
  isChildModalOpen?: boolean;
  onClose: () => void;
  onOpenAddSupplier: () => void;
  onSaved: (result: { invoice: PurchaseInvoice; approved: boolean; confirmError?: string }) => Promise<void> | void;
}

function createEmptyLine(index: number): PurchaseLineDraft {
  return {
    key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    variantId: "",
    quantityInput: "1",
    unitCostInput: "0",
  };
}

export default function PurchaseInvoiceForm({
  open,
  suppliers,
  variants,
  selectedSupplierIdOverride,
  isChildModalOpen = false,
  onClose,
  onOpenAddSupplier,
  onSaved,
}: PurchaseInvoiceFormProps) {
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => toDateInputValue());
  const [extraCostsInput, setExtraCostsInput] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLineDraft[]>([createEmptyLine(0)]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [submittingMode, setSubmittingMode] = useState<"draft" | "approve" | null>(null);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [createdDraftId, setCreatedDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSupplierId("");
      setInvoiceNumber("");
      setInvoiceDate(toDateInputValue());
      setExtraCostsInput("0");
      setNotes("");
      setLines([createEmptyLine(0)]);
      setFieldErrors({});
      setApiError("");
      setSubmittingMode(null);
      setConfirmApproveOpen(false);
      setCreatedDraftId(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && selectedSupplierIdOverride) {
      setSupplierId(selectedSupplierIdOverride);
      setFieldErrors((prev) => {
        if (!prev.supplierId) return prev;
        const next = { ...prev };
        delete next.supplierId;
        return next;
      });
    }
  }, [open, selectedSupplierIdOverride]);

  const liveTotals = useMemo(() => {
    let subtotalCents = 0;
    let totalUnits = 0;
    for (const line of lines) {
      const qty = parsePositiveQuantity(line.quantityInput);
      const cost = line.unitCostInput.trim() === "" ? 0 : parseEgpToPiasters(line.unitCostInput);
      if (qty !== null) {
        totalUnits += qty;
        subtotalCents = add(subtotalCents, computeLineTotalCents(qty, cost));
      }
    }
    const extraCostsCents =
      extraCostsInput.trim() === "" ? 0 : (parseEgpToPiasters(extraCostsInput) ?? 0);
    return {
      itemsCount: lines.length,
      totalUnits,
      subtotalCents,
      extraCostsCents,
      totalCents: add(subtotalCents, extraCostsCents),
    };
  }, [lines, extraCostsInput]);

  const validateCurrent = () => {
    setApiError("");
    const result = validatePurchaseInvoiceDraft({
      supplierId,
      invoiceNumber,
      invoiceDate,
      extraCostsInput,
      notes,
      lines,
    });
    if (!result.ok) {
      setFieldErrors(result.fieldErrors);
      setApiError(result.message);
      return null;
    }
    setFieldErrors({});
    return result;
  };

  const handleSaveDraft = async () => {
    if (submittingMode) return;
    const valid = validateCurrent();
    if (!valid) return;

    setSubmittingMode("draft");
    try {
      const res = await operationsApi.createPurchase(valid.payload);
      await onSaved({ invoice: res.data, approved: false });
      onClose();
    } catch (error) {
      setApiError(formatPurchaseApiError(error, "تعذر حفظ مسودة الفاتورة."));
    } finally {
      setSubmittingMode(null);
    }
  };

  const handleRequestApprove = () => {
    if (submittingMode) return;
    const valid = validateCurrent();
    if (!valid) return;
    setConfirmApproveOpen(true);
  };

  const handleConfirmAndApprove = async () => {
    if (submittingMode) return;
    const valid = validateCurrent();
    if (!valid) {
      setConfirmApproveOpen(false);
      return;
    }

    setSubmittingMode("approve");
    let draftInvoice: PurchaseInvoice | null = null;
    try {
      const created = createdDraftId
        ? null
        : await operationsApi.createPurchase(valid.payload);
      if (created) {
        draftInvoice = created.data;
        setCreatedDraftId(created.data.id);
      }
      const targetDraftId = createdDraftId ?? created!.data.id;

      const confirmed = await operationsApi.confirmPurchase(targetDraftId);
      setConfirmApproveOpen(false);
      await onSaved({ invoice: confirmed.data, approved: true });
      onClose();
    } catch (error) {
      setConfirmApproveOpen(false);
      if (draftInvoice || createdDraftId) {
        const savedDraft = draftInvoice ?? ({ id: createdDraftId } as PurchaseInvoice);
        await onSaved({
          invoice: savedDraft,
          approved: false,
          confirmError: `تم حفظ الفاتورة كمسودة، لكن تعذر اعتمادها: ${formatPurchaseApiError(error)} يمكنك اعتمادها من جدول الفواتير.`,
        });
        onClose();
      } else {
        setApiError(formatPurchaseApiError(error, "تعذر إنشاء أو اعتماد فاتورة الشراء."));
      }
    } finally {
      setSubmittingMode(null);
    }
  };

  const isBusy = submittingMode !== null;

  return (
    <>
      <DrawerModal
        open={open}
        onClose={() => {
          if (!isBusy && !isChildModalOpen && !confirmApproveOpen) {
            onClose();
          }
        }}
        title="إضافة فاتورة شراء جديدة"
        subtitle="أدخل بيانات المورد والأصناف المشتراة واحفظها كمسودة أو اعتمدها لإضافتها للمخزون."
        maxWidthClass="max-w-5xl"
        footer={
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-[#101B30]/70 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>المسودة لا تغيّر المخزون؛ الاعتماد يضيف الكمية ويحدّث متوسط التكلفة.</span>
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isBusy}
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleSaveDraft()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101B30] hover:bg-[#1a2b4c] text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {submittingMode === "draft" && (
                  <span
                    className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  />
                )}
                <span>{submittingMode === "draft" ? "جارٍ الحفظ..." : "حفظ كمسودة"}</span>
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={handleRequestApprove}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {submittingMode === "approve" && (
                  <span
                    className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  />
                )}
                <span>اعتماد الفاتورة وإضافتها للمخزون</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {apiError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
            >
              {apiError}
            </div>
          )}

          {/* SECTION A — Invoice Information */}
          <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/40 p-4 space-y-4">
            <h4 className="text-xs font-extrabold text-[#101B30]">بيانات الفاتورة</h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-6">
                <SupplierSelector
                  suppliers={suppliers}
                  value={supplierId}
                  onChange={(id) => {
                    setSupplierId(id);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.supplierId;
                      return next;
                    });
                  }}
                  onAddNewSupplier={onOpenAddSupplier}
                  error={fieldErrors.supplierId}
                />
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="purchase-invoice-number"
                  className="block text-xs font-bold text-[#101B30] mb-1.5"
                >
                  رقم فاتورة المورد
                </label>
                <input
                  id="purchase-invoice-number"
                  type="text"
                  maxLength={100}
                  dir="ltr"
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder="INV-2026-001"
                  className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 text-right focus:outline-hidden focus:border-[#C8102E]"
                />
                {fieldErrors.invoiceNumber && (
                  <p className="mt-1 text-[11px] font-medium text-[#C8102E]">
                    {fieldErrors.invoiceNumber}
                  </p>
                )}
              </div>

              <div className="md:col-span-3">
                <label
                  htmlFor="purchase-invoice-date"
                  className="block text-xs font-bold text-[#101B30] mb-1.5"
                >
                  تاريخ الفاتورة
                </label>
                <input
                  id="purchase-invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
                />
              </div>
            </div>
          </section>

          {/* SECTION B — Purchased Products */}
          <InvoiceItemsTable
            lines={lines}
            variants={variants}
            fieldErrors={fieldErrors}
            onUpdateLine={(key, updated) =>
              setLines((prev) => prev.map((row) => (row.key === key ? updated : row)))
            }
            onRemoveLine={(key) =>
              setLines((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev))
            }
            onAddLine={() => setLines((prev) => [...prev, createEmptyLine(prev.length)])}
          />

          {/* SECTION C — Financial Summary */}
          <InvoiceFinancialSummary
            itemsCount={liveTotals.itemsCount}
            totalUnits={liveTotals.totalUnits}
            subtotalCents={liveTotals.subtotalCents}
            extraCostsCents={liveTotals.extraCostsCents}
            extraCostsInput={extraCostsInput}
            onExtraCostsChange={setExtraCostsInput}
            extraCostsError={fieldErrors.extraCosts}
          />

          {/* SECTION D — Notes */}
          <section>
            <label
              htmlFor="purchase-invoice-notes"
              className="block text-xs font-bold text-[#101B30] mb-1.5"
            >
              ملاحظات الفاتورة
            </label>
            <textarea
              id="purchase-invoice-notes"
              rows={2}
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="أي ملاحظات إضافية عن التوريد أو الاتفاق مع المورد (اختياري)..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E] resize-none"
            />
            {fieldErrors.notes && (
              <p className="mt-1 text-[11px] font-medium text-[#C8102E]">{fieldErrors.notes}</p>
            )}
          </section>
        </div>
      </DrawerModal>

      <ConfirmationDialog
        open={confirmApproveOpen}
        variant="approve"
        title="تأكيد اعتماد فاتورة الشراء"
        message={`هل تريد اعتماد هذه الفاتورة بقيمة ${formatEGP(liveTotals.totalCents)}؟ سيتم إضافة الكميات (${liveTotals.totalUnits} قطعة) إلى المخزون وتحديث متوسط التكلفة فوراً، ولا يمكن التراجع عن الاعتماد.`}
        confirmLabel="نعم، اعتماد وإضافة للمخزون"
        loadingLabel="جارٍ الاعتماد..."
        loading={submittingMode === "approve"}
        onCancel={() => {
          if (submittingMode !== "approve") setConfirmApproveOpen(false);
        }}
        onConfirm={() => void handleConfirmAndApprove()}
      />
    </>
  );
}
