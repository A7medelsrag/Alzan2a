interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "empty" | "filtered";
}

export default function EmptyState({
  title = "لا توجد فواتير شراء حتى الآن.",
  description = "قم بإضافة فاتورة شراء جديدة للبدء.",
  actionLabel = "إضافة فاتورة شراء جديدة",
  onAction,
  variant = "empty",
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-8 md:p-14 text-center flex flex-col items-center justify-center shadow-2xs">
      <div className="relative w-20 h-20 rounded-3xl bg-[#FDF2F4] border border-[#C8102E]/10 flex items-center justify-center mb-4">
        {variant === "filtered" ? (
          <svg
            className="w-9 h-9 text-[#101B30]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.7}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-10 h-10 text-[#101B30]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.6}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h4m-4-8h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
            />
          </svg>
        )}
        {variant === "empty" && (
          <span
            className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-[#C8102E] text-white flex items-center justify-center shadow-sm"
            aria-hidden="true"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5"
              />
            </svg>
          </span>
        )}
      </div>

      <h3 className="text-base font-extrabold text-[#101B30]">{title}</h3>
      <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 max-w-md leading-relaxed">
        {description}
      </p>

      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className={`mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-colors ${
            variant === "filtered"
              ? "border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[#101B30]"
              : "bg-[#C8102E] hover:bg-[#a50d26] text-white shadow-xs"
          }`}
        >
          {variant === "empty" && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
