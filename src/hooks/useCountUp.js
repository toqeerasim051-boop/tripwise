import { useEffect, useRef, useState } from 'react';

const canObserve = () => typeof IntersectionObserver !== 'undefined';

/**
 * Counts from 0 up to `target` (ease-out, `durationMs`) the first time the element behind `ref`
 * scrolls into view. Without IntersectionObserver (old browsers, tests) it shows `target` at once.
 * Returns [ref, currentValue].
 */
export function useCountUp(target, durationMs = 1600) {
  const ref = useRef(null);
  const [value, setValue] = useState(() => (canObserve() ? 0 : target));

  useEffect(() => {
    const element = ref.current;
    if (!element || !canObserve()) return undefined;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min(1, (now - start) / durationMs);
          setValue(Math.round(target * (1 - (1 - progress) ** 3)));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs]);

  return [ref, value];
}
