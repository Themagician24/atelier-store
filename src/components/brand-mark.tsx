import { useId } from "react";

/**
 * The JAB monogram, after the great interlaced maison monograms: compact
 * Didone letters woven together. The A's crossbar passes over the J and its
 * thick leg over the B; each "under" letter is cut by a mask, so the weave
 * shows on paper (header) and on ink (footer) alike, in currentColor.
 * Hairlines are drawn heavier than print would use so they survive at the
 * 18–20px the header sets it at.
 * Decorative beside the wordmark, which carries the accessible name.
 */
export function BrandMark({ className = "h-5 w-auto" }: { className?: string }) {
  const id = useId();
  const underCrossbar = `${id}-j`;
  const underLeg = `${id}-b`;

  return (
    <svg
      viewBox="0 2 44 40"
      aria-hidden="true"
      fill="currentColor"
      stroke="currentColor"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <mask id={underCrossbar} maskUnits="userSpaceOnUse">
          <rect width="44" height="44" fill="#fff" stroke="none" />
          <path d="M2 28 H13" stroke="#000" strokeWidth="4.6" />
        </mask>
        <mask id={underLeg} maskUnits="userSpaceOnUse">
          <rect width="44" height="44" fill="#fff" stroke="none" />
          <path
            d="M20.2 4 H23.8 L35.5 40 H30.5 Z"
            fill="#000"
            stroke="#000"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </mask>
      </defs>

      {/* J: thick stem, hairline serif, ball terminal */}
      <g mask={`url(#${underCrossbar})`}>
        <path d="M8.5 9 V30 Q8.5 35.5 4 35.5" strokeWidth="4" fill="none" />
        <path d="M4.5 9 H12.5" strokeWidth="1.8" />
        <circle cx="3.6" cy="33.6" r="2.1" stroke="none" />
      </g>

      {/* B: thick stem, hairline bowls */}
      <g mask={`url(#${underLeg})`} fill="none" strokeWidth="2.2">
        <path d="M33.8 14 V36" strokeWidth="3.6" />
        <path d="M32 14.9 H37 Q40.6 14.9 40.6 19.5 Q40.6 24.6 37 24.6 H32" />
        <path d="M32 24.6 H37.6 Q42 24.6 42 30.2 Q42 35.1 37.6 35.1 H32" />
      </g>

      {/* A: hairline left leg, thick right leg, crossbar run out through the J */}
      <path d="M21.4 4 L11 40" strokeWidth="1.8" fill="none" />
      <path d="M20.2 4 H23.8 L35.5 40 H30.5 Z" stroke="none" />
      <path d="M3 28 H32" strokeWidth="1.8" />
      <path d="M8 40 H14 M29 40 H37.5" strokeWidth="1.8" />
    </svg>
  );
}
