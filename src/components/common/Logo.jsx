/**
 * The TripWise icon mark: a pin and a paper plane joined by a dashed flight path, on a teal tile.
 * Decorative; the wordmark (or the surrounding label) names it.
 */
export function LogoMark({ className = 'size-9' }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary to-primary-hover text-on-primary shadow-card ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[62%] overflow-visible"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 21s-3.8-3.4-3.8-6.2a3.8 3.8 0 0 1 7.6 0c0 2.8-3.8 6.2-3.8 6.2z" />
        <circle cx="6.5" cy="14.8" r="1.2" fill="currentColor" stroke="none" />
        <path d="M8.2 9.6c1.3-2.6 3.3-3.6 5.6-3.4" strokeDasharray="1.4 2.2" />
        <g className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <path d="M21.5 2.5 13.6 5.4l3.6 2 1.9 3.6z" fill="currentColor" />
          <path d="m17.2 7.4 4.3-4.9" stroke="var(--color-primary)" strokeWidth="1.1" />
        </g>
      </svg>
    </span>
  );
}

/**
 * Icon mark + "TripWise" wordmark (serif, accent "Wise").
 * `tone`: 'default' on light/dark surfaces, 'onScrim' on the dark footer.
 */
export default function Logo({ tone = 'default' }) {
  const accent = tone === 'onScrim' ? 'text-on-scrim-accent' : 'text-primary';
  return (
    <span className="group inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-2xl leading-none font-bold tracking-tight">
        Trip<span className={`italic ${accent}`}>Wise</span>
      </span>
    </span>
  );
}
