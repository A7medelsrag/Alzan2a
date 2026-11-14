import { useEffect, type ReactNode } from "react";

interface DrawerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
}

export default function DrawerModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidthClass = "max-w-2xl",
}: DrawerModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full ${maxWidthClass} max-h-[92vh] flex flex-col overflow-hidden`}
        dir="rtl"
      >
        <div className="px-5 py-4 border-b border-neutral-100 flex items-start justify-between gap-3 shrink-0 bg-white">
          <div className="min-w-0">
            <h3 id="drawer-modal-title" className="text-base md:text-lg font-bold text-[#101B30]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-8 h-8 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 flex items-center justify-center shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-neutral-100 bg-neutral-50/70 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
