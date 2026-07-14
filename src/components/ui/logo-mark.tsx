import * as React from "react";

export interface LogoMarkProps {
  /** Optional extra classes forwarded to the root `<svg>` (e.g. `w-5 h-5`, `text-primary`). */
  className?: string;
}

/**
 * LogoMark — minimalist FinanceGuy brand glyph.
 *
 * A shield silhouette formed by the intersection of two bar-chart bars of
 * different heights. The drawing inherits `currentColor` so utilities such as
 * `text-white` / `text-primary` control its color. Self-contained (no external
 * icon dependency).
 */
export const LogoMark: React.FC<LogoMarkProps> = ({ className }) => {
  return (
    <svg
      role="img"
      aria-label="FinanceGuy"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield boundary (outline) */}
      <path
        d="M4 3 H20 V11 C20 16 16 19 12 21 C8 19 4 16 4 11 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      {/* Two bar-chart bars of different heights intersecting the shield */}
      <rect x="8" y="9" width="3" height="7" rx="1" fill="currentColor" />
      <rect x="13" y="6" width="3" height="10" rx="1" fill="currentColor" />
    </svg>
  );
};

LogoMark.displayName = "LogoMark";

export default LogoMark;
