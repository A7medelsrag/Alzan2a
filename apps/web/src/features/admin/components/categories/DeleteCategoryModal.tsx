import { useEffect } from "react";
import type { AdminCategory } from "../../api/management";

interface DeleteCategoryModalProps {
  category: AdminCategory | null;
  childrenCount: number;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteCategoryModal({
  category,
  childrenCount,
  deleting,
  onCancel,
  onConfirm,
}: DeleteCategoryModalProps) {
  useEffect(() => {
    if (!category) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [category, deleting, onCancel]);

  if (!category) return null;

  const hasProducts = category.productCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101B30]/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-category-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel();
      }}
    >
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-[#C8102E] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 id="delete-category-title" className="text-base font-black text-[#101B30]">
              {hasProducts ? "لا يمكن حذف القسم" : "تأكيد حذف القسم"}
            </h3>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
              {hasProducts ? (
                <>
                  القسم <strong className="text-[#101B30]">&ldquo;{category.name}&rdquo;</strong> يحتوي حالياً على{" "}
                  <strong className="text-[#C8102E]">{category.productCount.toLocaleString("ar-EG")} منتج</strong>. يرجى نقل المنتجات إلى قسم آخر أو حذفها أولاً.
                </>
              ) : (
                <>
                  هل أنت متأكد من رغبتك في حذف قسم{" "}
                  <strong className="text-[#101B30]">&ldquo;{category.name}&rdquo;</strong>؟ لا يمكن التراجع عن هذا الإجراء.
                </>
              )}
            </p>
          </div>
        </div>

        {!hasProducts && childrenCount > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
            تنبيه: هذا القسم يحتوي على <strong>{childrenCount.toLocaleString("ar-EG")} قسم فرعي</strong>، وسيتم حذفها تلقائياً عند حذف القسم الرئيسي.
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
          {hasProducts ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-[#101B30] hover:bg-[#1b2b4a] text-xs font-bold text-white transition-colors"
            >
              حسناً
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={deleting}
                onClick={onCancel}
                className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void onConfirm()}
                className="px-4 py-2 rounded-xl bg-[#C8102E] hover:bg-[#a50d26] text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {deleting ? "جاري الحذف..." : "نعم، حذف القسم"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
