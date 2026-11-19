import { useEffect } from "react";

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  variant?: "approve" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  loadingLabel = "جارٍ التنفيذ...",
  variant = "approve",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const isApprove = variant === "approve";

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="purchase-confirm-title"
      aria-describedby="purchase-confirm-desc"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-md p-6 space-y-4"
        dir="rtl"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isApprove
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-[#C8102E]"
            }`}
          >
            {isApprove ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="purchase-confirm-title" className="text-base font-bold text-[#101B30]">
              {title}
            </h3>
            <p
              id="purchase-confirm-desc"
              className="text-xs text-neutral-600 mt-1.5 leading-relaxed"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 ${
              isApprove
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-[#C8102E] hover:bg-[#a50d26]"
            }`}
          >
            {loading && (
              <span
                className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                aria-hidden="true"
              />
            )}
            <span>{loading ? loadingLabel : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
