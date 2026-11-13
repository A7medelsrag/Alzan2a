import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "bag"
  | "bell"
  | "box"
  | "chart"
  | "chevron-down"
  | "grid"
  | "heart"
  | "menu"
  | "search"
  | "settings"
  | "truck"
  | "user"
  | "users";

const iconPaths: Record<IconName, ReactNode> = {
  bag: (
    <>
      <path d="M5 8h14l1 13H4L5 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="M3 8v9l9 5 9-5V8M12 13v9" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h17" />
      <path d="m7 15 4-4 3 2 6-7" />
    </>
  ),
  "chevron-down": <path d="m7 10 5 5 5-5" />,
  grid: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </>
  ),
  heart: (
    <path d="M20.8 8.6c0 5.2-8.8 10.1-8.8 10.1S3.2 13.8 3.2 8.6a4.5 4.5 0 0 1 8.8-1.3 4.5 4.5 0 0 1 8.8 1.3Z" />
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4 4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m19.4 15 .1.1 1.2 1-1.3 2.2-1.5-.5a8 8 0 0 1-1.5.9l-.3 1.6h-2.6l-.3-1.6a8 8 0 0 1-1.5-.9l-1.5.5-1.3-2.2 1.2-1a8 8 0 0 1 0-1.8l-1.2-1 1.3-2.2 1.5.5a8 8 0 0 1 1.5-.9l.3-1.6h2.6l.3 1.6a8 8 0 0 1 1.5.9l1.5-.5 1.3 2.2-1.2 1a8 8 0 0 1 0 1.7Z" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7" />
      <circle cx="7.5" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
};

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span aria-hidden="true" className={`brand-mark${compact ? " brand-mark--compact" : ""}`}>
      <span className="brand-mark__glyph">ز</span>
    </span>
  );
}
