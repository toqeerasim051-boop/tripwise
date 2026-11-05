/** Decorative loading placeholder. Wrap groups in an element with aria-busy and an sr-only label. */
export default function Skeleton({ className = '' }) {
  return (
    <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface-muted ${className}`} />
  );
}
