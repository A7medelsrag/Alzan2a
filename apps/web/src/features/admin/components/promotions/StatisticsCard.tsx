import type { ReactNode } from "react";

export type StatAccent = "burgundy" | "navy" | "gold" | "emerald" | "neutral";

interface StatisticsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: StatAccent;
  hint?: string;
}

const accentStyles: Record<StatAccent, { iconBg: string; iconText: string; bar: string }> = {
  burgundy: {
    iconBg: "bg-[#C8102E]/10",
    iconText: "text-[#C8102E]",
    bar: "bg-[#C8102E]",
  },
  navy: {
    iconBg: "bg-[#101B30]/10",
    iconText: "text-[#101B30]",
    bar: "bg-[#101B30]",
  },
  gold: {
    iconBg: "bg-[#D6A33A]/15",
    iconText: "text-[#9A6F16]",
    bar: "bg-[#D6A33A]",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-700",
    bar: "bg-emerald-600",
  },
  neutral: {
    iconBg: "bg-neutral-100",
    iconText: "text-neutral-600",
    bar: "bg-neutral-400",
  },
};

export default function StatisticsCard({
  label,
  value,
  icon,
  accent = "navy",
  hint,
}: StatisticsCardProps) {
  const style = accentStyles[accent];

  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-neutral-200/80 p-4 md:p-5 shadow-xs transition-shadow hover:shadow-sm min-w-0">
      <div className={`absolute top-0 inset-x-0 h-1 ${style.bar}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-neutral-500 truncate">{label}</p>
          <p className="mt-2 text-2xl font-extrabold text-[#101B30] tabular-nums">
            {value}
          </p>
          {hint && <p className="mt-1 text-[11px] text-neutral-400 truncate">{hint}</p>}
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg} ${style.iconText}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
