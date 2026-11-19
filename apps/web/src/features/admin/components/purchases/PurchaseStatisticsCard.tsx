import type { ReactNode } from "react";

export type PurchaseStatTone = "gold" | "burgundy" | "emerald" | "navy";

interface PurchaseStatisticsCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone: PurchaseStatTone;
  icon: ReactNode;
}

const toneStyles: Record<
  PurchaseStatTone,
  { surface: string; iconWrap: string; accentBar: string }
> = {
  gold: {
    surface: "bg-[#FFFBEB]/85 border-[#D6A33A]/30",
    iconWrap: "bg-[#D6A33A]/20 text-[#9A6F16]",
    accentBar: "bg-[#D6A33A]",
  },
  burgundy: {
    surface: "bg-[#FDF2F4]/85 border-[#C8102E]/15",
    iconWrap: "bg-[#C8102E]/10 text-[#C8102E]",
    accentBar: "bg-[#C8102E]",
  },
  emerald: {
    surface: "bg-emerald-50/80 border-emerald-200/75",
    iconWrap: "bg-emerald-100 text-emerald-700",
    accentBar: "bg-emerald-600",
  },
  navy: {
    surface: "bg-[#EEF2FF]/75 border-indigo-200/75",
    iconWrap: "bg-[#101B30]/10 text-[#101B30]",
    accentBar: "bg-[#101B30]",
  },
};

export default function PurchaseStatisticsCard({
  label,
  value,
  hint,
  tone,
  icon,
}: PurchaseStatisticsCardProps) {
  const style = toneStyles[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${style.surface} px-4 py-4 shadow-2xs transition-shadow hover:shadow-xs min-w-0`}
    >
      <div className={`absolute top-0 inset-x-0 h-1 ${style.accentBar}`} aria-hidden="true" />
      <div className="flex items-center gap-3.5">
        <div
          className={`w-11 h-11 rounded-xl ${style.iconWrap} flex items-center justify-center shrink-0`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-neutral-600 truncate">{label}</p>
          <p className="mt-0.5 text-lg md:text-xl font-black text-[#101B30] tabular-nums truncate">
            {value}
          </p>
          {hint && <p className="mt-0.5 text-[11px] text-neutral-500 truncate">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
