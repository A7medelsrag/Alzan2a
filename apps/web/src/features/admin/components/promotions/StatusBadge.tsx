import type { PromotionStatus } from "./lifecycle";

interface StatusBadgeProps {
  status: PromotionStatus;
}

const statusConfig: Record<
  PromotionStatus,
  { label: string; classes: string; dot: string }
> = {
  active: {
    label: "نشط",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  scheduled: {
    label: "مجدول",
    classes: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  expired: {
    label: "منتهي",
    classes: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  exhausted: {
    label: "مكتمل الاستخدام",
    classes: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  inactive: {
    label: "معطّل",
    classes: "bg-neutral-100 text-neutral-600 border-neutral-200",
    dot: "bg-neutral-400",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${cfg.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}
