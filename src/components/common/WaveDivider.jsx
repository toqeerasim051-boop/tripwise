/**
 * Decorative wave edge between sections. Its colour is `currentColor`, so give it the text colour
 * of the section it leads into (e.g. `text-canvas`).
 */
export default function WaveDivider({ className = '', flip = false }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      className={`block h-8 w-full sm:h-14 ${flip ? 'rotate-180' : ''} ${className}`}
      fill="currentColor"
    >
      <path d="M0 48C180 80 360 84 540 62S900 4 1080 10s300 40 360 46V80H0Z" />
    </svg>
  );
}
