import { useEffect, useState, type FormEvent } from "react";
import DrawerModal from "../promotions/DrawerModal";
import { operationsApi, type Supplier } from "../../api/operations";
import { formatPurchaseApiError, validateSupplierDraft } from "./purchasesHelpers";

interface SupplierModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: Supplier) => void;
}

export default function SupplierModal({ open, onClose, onCreated }: SupplierModalProps) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setContactName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setFieldErrors({});
      setApiError("");
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setApiError("");
    const validation = validateSupplierDraft({ name, contactName, phone, email, address });
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const response = await operationsApi.createSupplier(validation.payload);
      onCreated(response.data);
      onClose();
    } catch (error) {
      setApiError(formatPurchaseApiError(error, "تعذر إضافة المورد. تحقق من البيانات وحاول مرة أخرى."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerModal
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="إضافة مورد جديد"
      subtitle="أدخل بيانات المورد لاستخدامه في فواتير الشراء."
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
            form="supplier-create-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
          >
            {submitting && (
              <span
                className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                aria-hidden="true"
              />
            )}
            <span>{submitting ? "جارٍ الحفظ..." : "حفظ المورد"}</span>
          </button>
        </>
      }
    >
      <form id="supplier-create-form" onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
          >
            {apiError}
          </div>
        )}

        <div>
          <label htmlFor="supplier-name" className="block text-xs font-bold text-[#101B30] mb-1.5">
            اسم المورد <span className="text-[#C8102E]">*</span>
          </label>
          <input
            id="supplier-name"
            type="text"
            required
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="مثال: شركة النيل للتوريدات"
            className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
          />
          {fieldErrors.name && (
            <p className="mt-1 text-[11px] font-medium text-[#C8102E]">{fieldErrors.name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label
              htmlFor="supplier-contact"
              className="block text-xs font-bold text-[#101B30] mb-1.5"
            >
              اسم المسؤول / جهة الاتصال
            </label>
            <input
              id="supplier-contact"
              type="text"
              maxLength={150}
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="الاسم أو المندوب"
              className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E]"
            />
            {fieldErrors.contactName && (
              <p className="mt-1 text-[11px] font-medium text-[#C8102E]">
                {fieldErrors.contactName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="supplier-phone" className="block text-xs font-bold text-[#101B30] mb-1.5">
              رقم الهاتف
            </label>
            <input
              id="supplier-phone"
              type="tel"
              dir="ltr"
              maxLength={40}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="01000000000"
              className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 text-right focus:outline-hidden focus:border-[#C8102E]"
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-[11px] font-medium text-[#C8102E]">{fieldErrors.phone}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="supplier-email" className="block text-xs font-bold text-[#101B30] mb-1.5">
            البريد الإلكتروني
          </label>
          <input
            id="supplier-email"
            type="email"
            dir="ltr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="supplier@example.com"
            className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 text-right focus:outline-hidden focus:border-[#C8102E]"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-[11px] font-medium text-[#C8102E]">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="supplier-address" className="block text-xs font-bold text-[#101B30] mb-1.5">
            العنوان
          </label>
          <textarea
            id="supplier-address"
            rows={2}
            maxLength={500}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="العنوان بالتفصيل (اختياري)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 focus:outline-hidden focus:border-[#C8102E] resize-none"
          />
          {fieldErrors.address && (
            <p className="mt-1 text-[11px] font-medium text-[#C8102E]">{fieldErrors.address}</p>
          )}
        </div>
      </form>
    </DrawerModal>
  );
}
