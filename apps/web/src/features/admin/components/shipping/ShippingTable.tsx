import type { ShippingRate } from "../../api/operations";
import {
  isShippingDraftDirty,
  validateShippingDraft,
  type ShippingRateDraft,
} from "./shippingHelpers";

interface ShippingTableProps {
  items: ShippingRateDraft[];
  savedByGov: Record<string, ShippingRate>;
  savingGovs: Record<string, boolean>;
  justSavedGovs: Record<string, boolean>;
  rowErrors: Record<string, string>;
  bulkSaving: boolean;
  totalFilteredCount: number;
  totalAllCount: number;
  currentPage: number;
  totalPages: number;
  pageStartIndex: number;
  pageEndIndex: number;
  onPageChange: (page: number) => void;
  onFieldChange: (
    governorate: string,
    field: "priceInput" | "minDaysInput" | "maxDaysInput",
    value: string,
  ) => void;
  onToggleEnabled: (governorate: string) => void;
  onSaveRow: (governorate: string) => void;
  onResetRow: (governorate: string) => void;
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

export default function ShippingTable({
  items,
  savedByGov,
  savingGovs,
  justSavedGovs,
  rowErrors,
  bulkSaving,
  totalFilteredCount,
  totalAllCount,
  currentPage,
  totalPages,
  pageStartIndex,
  pageEndIndex,
  onPageChange,
  onFieldChange,
  onToggleEnabled,
  onSaveRow,
  onResetRow,
}: ShippingTableProps) {
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="min-w-0">
      {/* Desktop & Tablet Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-start text-xs">
          <thead>
            <tr className="bg-[#101B30] text-white">
              <th scope="col" className="px-4 py-3.5 font-bold whitespace-nowrap text-start">
                المحافظة
              </th>
              <th scope="col" className="px-3 py-3.5 font-bold whitespace-nowrap text-center">
                السعر (جنيه)
              </th>
              <th scope="col" className="px-3 py-3.5 font-bold whitespace-nowrap text-center">
                أقل مدة (يوم)
              </th>
              <th scope="col" className="px-3 py-3.5 font-bold whitespace-nowrap text-center">
                أقصى مدة (يوم)
              </th>
              <th scope="col" className="px-3 py-3.5 font-bold whitespace-nowrap text-center">
                الحالة
              </th>
              <th scope="col" className="px-4 py-3.5 font-bold whitespace-nowrap text-center">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((draft) => {
              const saved = savedByGov[draft.governorate];
              const isDirty = saved ? isShippingDraftDirty(draft, saved) : false;
              const validation = validateShippingDraft(draft);
              const isSaving = Boolean(savingGovs[draft.governorate]);
              const isJustSaved = Boolean(justSavedGovs[draft.governorate]) && !isDirty;
              const rowError = rowErrors[draft.governorate];
              const priceErrId = `price-err-${draft.governorate}`;
              const minErrId = `min-err-${draft.governorate}`;
              const maxErrId = `max-err-${draft.governorate}`;

              return (
                <tr
                  key={draft.governorate}
                  className={`transition-colors align-top ${
                    isDirty
                      ? "bg-amber-50/35 hover:bg-amber-50/55"
                      : !draft.isEnabled
                        ? "bg-neutral-50/60 hover:bg-neutral-100/60"
                        : "bg-white hover:bg-neutral-50/80"
                  }`}
                >
                  {/* A. Governorate */}
                  <td className="px-4 py-3.5 align-middle min-w-[155px]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          draft.isEnabled
                            ? "bg-neutral-100 text-neutral-500"
                            : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.9}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 21s-6-5.373-6-10a6 6 0 1112 0c0 4.627-6 10-6 10z"
                          />
                          <circle cx="12" cy="11" r="2.2" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <span className="block font-bold text-[#101B30] text-sm leading-snug">
                          {draft.governorate}
                        </span>
                        {isDirty && (
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md">
                            غير محفوظ
                          </span>
                        )}
                        {isJustSaved && (
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                            تم الحفظ
                          </span>
                        )}
                        {rowError && (
                          <p role="alert" className="mt-1 text-[11px] font-semibold text-rose-700">
                            {rowError}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* B. Price */}
                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        aria-label={`سعر الشحن لمحافظة ${draft.governorate} بالجنيه`}
                        aria-invalid={Boolean(validation.priceError)}
                        aria-describedby={validation.priceError ? priceErrId : undefined}
                        disabled={isSaving || bulkSaving}
                        value={draft.priceInput}
                        onChange={(e) =>
                          onFieldChange(draft.governorate, "priceInput", e.target.value)
                        }
                        className={`h-10 w-28 rounded-xl border px-3 text-center text-xs font-bold tabular-nums transition-all focus:outline-hidden focus:ring-2 disabled:bg-neutral-100 disabled:text-neutral-500 ${
                          validation.priceError
                            ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/15"
                            : "border-neutral-200 bg-white text-[#101B30] focus:border-[#C8102E] focus:ring-[#C8102E]/10"
                        }`}
                      />
                      {validation.priceError && (
                        <span
                          id={priceErrId}
                          role="alert"
                          className="mt-1 text-[11px] font-semibold text-rose-600 text-center max-w-[140px]"
                        >
                          {validation.priceError}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* C. Min Delivery Days */}
                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        aria-label={`أقل مدة توصيل لمحافظة ${draft.governorate} بالأيام`}
                        aria-invalid={Boolean(validation.minDaysError)}
                        aria-describedby={validation.minDaysError ? minErrId : undefined}
                        disabled={isSaving || bulkSaving}
                        value={draft.minDaysInput}
                        onChange={(e) =>
                          onFieldChange(draft.governorate, "minDaysInput", e.target.value)
                        }
                        className={`h-10 w-24 rounded-xl border px-3 text-center text-xs font-bold tabular-nums transition-all focus:outline-hidden focus:ring-2 disabled:bg-neutral-100 disabled:text-neutral-500 ${
                          validation.minDaysError
                            ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/15"
                            : "border-neutral-200 bg-white text-[#101B30] focus:border-[#C8102E] focus:ring-[#C8102E]/10"
                        }`}
                      />
                      {validation.minDaysError && (
                        <span
                          id={minErrId}
                          role="alert"
                          className="mt-1 text-[11px] font-semibold text-rose-600 text-center max-w-[130px]"
                        >
                          {validation.minDaysError}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* D. Max Delivery Days */}
                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        aria-label={`أقصى مدة توصيل لمحافظة ${draft.governorate} بالأيام`}
                        aria-invalid={Boolean(validation.maxDaysError)}
                        aria-describedby={validation.maxDaysError ? maxErrId : undefined}
                        disabled={isSaving || bulkSaving}
                        value={draft.maxDaysInput}
                        onChange={(e) =>
                          onFieldChange(draft.governorate, "maxDaysInput", e.target.value)
                        }
                        className={`h-10 w-24 rounded-xl border px-3 text-center text-xs font-bold tabular-nums transition-all focus:outline-hidden focus:ring-2 disabled:bg-neutral-100 disabled:text-neutral-500 ${
                          validation.maxDaysError
                            ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/15"
                            : "border-neutral-200 bg-white text-[#101B30] focus:border-[#C8102E] focus:ring-[#C8102E]/10"
                        }`}
                      />
                      {validation.maxDaysError && (
                        <span
                          id={maxErrId}
                          role="alert"
                          className="mt-1 text-[11px] font-semibold text-rose-600 text-center max-w-[150px]"
                        >
                          {validation.maxDaysError}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* E. Status Switch */}
                  <td className="px-3 py-3.5 align-middle text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draft.isEnabled}
                      aria-label={`تفعيل أو تعطيل الشحن لمحافظة ${draft.governorate}`}
                      disabled={isSaving || bulkSaving}
                      onClick={() => onToggleEnabled(draft.governorate)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-neutral-100/90 disabled:opacity-60"
                    >
                      <span
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                          draft.isEnabled ? "bg-emerald-600" : "bg-neutral-300"
                        }`}
                      >
                        <span
                          className={`absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-all ${
                            draft.isEnabled ? "start-[19px]" : "start-[3px]"
                          }`}
                        />
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${
                          draft.isEnabled
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                        }`}
                      >
                        {draft.isEnabled ? "مفعل" : "غير مفعل"}
                      </span>
                    </button>
                  </td>

                  {/* F. Row Save & Reset Actions */}
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        disabled={isSaving || bulkSaving || !validation.isValid}
                        onClick={() => onSaveRow(draft.governorate)}
                        aria-label={`حفظ إعدادات ${draft.governorate}`}
                        title={
                          !validation.isValid
                            ? "يرجى تصحيح القيم غير الصالحة قبل الحفظ"
                            : `حفظ ${draft.governorate}`
                        }
                        className={`h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl text-xs font-bold shadow-2xs transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDirty
                            ? "bg-[#C8102E] hover:bg-[#a50d26] text-white"
                            : "bg-[#101B30] hover:bg-[#1a2b4c] text-white"
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <span
                              className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                              aria-hidden="true"
                            />
                            <span>جارٍ الحفظ</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-3.5 h-3.5 shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.2}
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span>حفظ</span>
                          </>
                        )}
                      </button>

                      {isDirty && (
                        <button
                          type="button"
                          disabled={isSaving || bulkSaving}
                          onClick={() => onResetRow(draft.governorate)}
                          aria-label={`تراجع عن تعديلات ${draft.governorate}`}
                          title="تراجع عن التعديل"
                          className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 transition-colors disabled:opacity-50"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 10h10a6 6 0 016 6v1M3 10l5-5m-5 5l5 5"
                            />
                          </svg>
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

      {/* Mobile Card List (< md) */}
      <div className="md:hidden divide-y divide-neutral-100">
        {items.map((draft) => {
          const saved = savedByGov[draft.governorate];
          const isDirty = saved ? isShippingDraftDirty(draft, saved) : false;
          const validation = validateShippingDraft(draft);
          const isSaving = Boolean(savingGovs[draft.governorate]);
          const isJustSaved = Boolean(justSavedGovs[draft.governorate]) && !isDirty;
          const rowError = rowErrors[draft.governorate];

          return (
            <article
              key={draft.governorate}
              className={`p-4 space-y-3.5 ${
                isDirty
                  ? "bg-amber-50/35"
                  : !draft.isEnabled
                    ? "bg-neutral-50/60"
                    : "bg-white"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center shrink-0">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.9}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 21s-6-5.373-6-10a6 6 0 1112 0c0 4.627-6 10-6 10z"
                      />
                      <circle cx="12" cy="11" r="2.2" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#101B30] text-sm truncate">
                      {draft.governorate}
                    </h3>
                    {isDirty && (
                      <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md">
                        غير محفوظ
                      </span>
                    )}
                    {isJustSaved && (
                      <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                        تم الحفظ
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.isEnabled}
                  aria-label={`تفعيل أو تعطيل الشحن لمحافظة ${draft.governorate}`}
                  disabled={isSaving || bulkSaving}
                  onClick={() => onToggleEnabled(draft.governorate)}
                  className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-neutral-100 disabled:opacity-60 shrink-0"
                >
                  <span
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                      draft.isEnabled ? "bg-emerald-600" : "bg-neutral-300"
                    }`}
                  >
                    <span
                      className={`absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-all ${
                        draft.isEnabled ? "start-[19px]" : "start-[3px]"
                      }`}
                    />
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      draft.isEnabled ? "text-emerald-700" : "text-neutral-500"
                    }`}
                  >
                    {draft.isEnabled ? "مفعل" : "غير مفعل"}
                  </span>
                </button>
              </div>

              {/* Inputs */}
              <div className="space-y-2.5">
                <label className="block space-y-1">
                  <span className="block text-[11px] font-semibold text-neutral-600">
                    السعر (جنيه)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    aria-invalid={Boolean(validation.priceError)}
                    disabled={isSaving || bulkSaving}
                    value={draft.priceInput}
                    onChange={(e) =>
                      onFieldChange(draft.governorate, "priceInput", e.target.value)
                    }
                    className={`w-full h-11 rounded-xl border px-3 text-sm font-bold tabular-nums focus:outline-hidden focus:ring-2 disabled:bg-neutral-100 ${
                      validation.priceError
                        ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/15"
                        : "border-neutral-200 bg-white text-[#101B30] focus:border-[#C8102E] focus:ring-[#C8102E]/10"
                    }`}
                  />
                  {validation.priceError && (
                    <span role="alert" className="block text-[11px] font-semibold text-rose-600">
                      {validation.priceError}
                    </span>
                  )}
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block space-y-1 min-w-0">
                    <span className="block text-[11px] font-semibold text-neutral-600">
                      أقل مدة (يوم)
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      aria-invalid={Boolean(validation.minDaysError)}
                      disabled={isSaving || bulkSaving}
                      value={draft.minDaysInput}
                      onChange={(e) =>
                        onFieldChange(draft.governorate, "minDaysInput", e.target.value)
                      }
                      className={`w-full h-11 rounded-xl border px-3 text-sm font-bold tabular-nums focus:outline-hidden focus:ring-2 disabled:bg-neutral-100 ${
                        validation.minDaysError
                          ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/15"
                          : "border-neutral-200 bg-white text-[#101B30] focus:border-[#C8102E] focus:ring-[#C8102E]/10"
                      }`}
                    />
                    {validation.minDaysError && (
                      <span role="alert" className="block text-[11px] font-semibold text-rose-600">
                        {validation.minDaysError}
                      </span>
                    )}
                  </label>

                  <label className="block space-y-1 min-w-0">
                    <span className="block text-[11px] font-semibold text-neutral-600">
                      أقصى مدة (يوم)
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      aria-invalid={Boolean(validation.maxDaysError)}
                      disabled={isSaving || bulkSaving}
                      value={draft.maxDaysInput}
                      onChange={(e) =>
                        onFieldChange(draft.governorate, "maxDaysInput", e.target.value)
                      }
                      className={`w-full h-11 rounded-xl border px-3 text-sm font-bold tabular-nums focus:outline-hidden focus:ring-2 disabled:bg-neutral-100 ${
                        validation.maxDaysError
                          ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500 focus:ring-rose-500/15"
                          : "border-neutral-200 bg-white text-[#101B30] focus:border-[#C8102E] focus:ring-[#C8102E]/10"
                      }`}
                    />
                    {validation.maxDaysError && (
                      <span role="alert" className="block text-[11px] font-semibold text-rose-600">
                        {validation.maxDaysError}
                      </span>
                    )}
                  </label>
                </div>
              </div>

              {rowError && (
                <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {rowError}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSaving || bulkSaving || !validation.isValid}
                  onClick={() => onSaveRow(draft.governorate)}
                  className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDirty
                      ? "bg-[#C8102E] hover:bg-[#a50d26] text-white"
                      : "bg-[#101B30] hover:bg-[#1a2b4c] text-white"
                  }`}
                >
                  {isSaving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                </button>
                {isDirty && (
                  <button
                    type="button"
                    disabled={isSaving || bulkSaving}
                    onClick={() => onResetRow(draft.governorate)}
                    className="min-h-[44px] px-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-xs font-semibold text-neutral-700"
                  >
                    تراجع
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Pagination & Count Footer */}
      <div className="px-4 py-3.5 border-t border-neutral-100 bg-neutral-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-neutral-500 font-medium tabular-nums">
          عرض <strong className="text-[#101B30]">{pageStartIndex}</strong> -{" "}
          <strong className="text-[#101B30]">{pageEndIndex}</strong> من{" "}
          <strong className="text-[#101B30]">{totalFilteredCount}</strong> محافظة
          {totalFilteredCount !== totalAllCount && (
            <span className="text-neutral-400"> (من أصل {totalAllCount})</span>
          )}
        </p>

        {totalPages > 1 && (
          <nav
            aria-label="ترقيم صفحات المحافظات"
            className="flex flex-wrap items-center justify-center gap-1.5"
          >
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              aria-label="الصفحة السابقة"
              className="w-8 h-8 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5 ltr:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {pageNumbers.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 text-xs text-neutral-400 select-none"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={item === currentPage ? "page" : undefined}
                  aria-label={`صفحة ${item}`}
                  className={`min-w-8 h-8 px-2 rounded-lg border text-xs font-bold tabular-nums transition-colors ${
                    item === currentPage
                      ? "border-[#C8102E] bg-[#C8102E] text-white shadow-2xs"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {item}
                </button>
              ),
            )}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              aria-label="الصفحة التالية"
              className="w-8 h-8 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 flex items-center justify-center text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5 ltr:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
