import type { ReactNode } from "react";
import { Link } from "react-router";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
}

export default function PageHeader({
  breadcrumbs,
  title,
  description,
  primaryAction,
  secondaryAction,
}: PageHeaderProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 md:p-6 shadow-xs">
      <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 mb-3">
        {breadcrumbs.map((item, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="hover:text-[#C8102E] transition-colors font-medium"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-[#101B30] font-semibold" : ""}>
                  {item.label}
                </span>
              )}
              {!isLast && <span className="text-neutral-300">/</span>}
            </span>
          );
        })}
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-[#101B30] tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        {(primaryAction || secondaryAction) && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {secondaryAction}
            {primaryAction}
          </div>
        )}
      </div>
    </div>
  );
}
