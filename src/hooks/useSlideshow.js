import { useEffect, useState } from 'react';

/**
 * Auto-advancing slideshow state: `index` moves on every `intervalMs`, always (owner's choice: no
 * pause control; slides only cross-fade). `seen` counts slides shown so far, so later photos are
 * only loaded when they are needed. A manual change (`goTo`) restarts the timer.
 */
export function useSlideshow(count, intervalMs) {
  const [{ index, seen }, setState] = useState({ index: 0, seen: 1 });

  const goTo = (next) =>
    setState((state) => ({ index: next, seen: Math.max(state.seen, next + 1) }));

  useEffect(() => {
    if (count < 2) return undefined;
    const timer = setInterval(
      () =>
        setState((state) => {
          const next = (state.index + 1) % count;
          return { index: next, seen: Math.max(state.seen, next + 1) };
        }),
      intervalMs,
    );
    return () => clearInterval(timer);
  }, [count, intervalMs, index]);

  return { index, seen, goTo };
}
