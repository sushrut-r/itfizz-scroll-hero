/**
 * Brand mark: a route that bends up to a drop-off point.
 * Drawn inline so it inherits the current text colour and needs no asset.
 */
export default function Mark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <rect
        x="0.5"
        y="0.5"
        width="17"
        height="17"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.28"
      />
      <path
        d="M4.4 13.2h4.1a2.9 2.9 0 0 0 2.9-2.9V7.6"
        fill="none"
        stroke="#f0a952"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="11.4" cy="6.4" r="1.7" fill="#f0a952" />
    </svg>
  );
}
