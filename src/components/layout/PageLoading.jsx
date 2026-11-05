import { LogoMark } from '../common/Logo.jsx';

/** Full-screen placeholder while the first page's code loads (the router's HydrateFallback). */
export default function PageLoading() {
  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas"
    >
      <LogoMark className="size-12 animate-pulse motion-reduce:animate-none" />
      <span className="text-sm text-fg-muted">Loading TripWise…</span>
    </div>
  );
}
