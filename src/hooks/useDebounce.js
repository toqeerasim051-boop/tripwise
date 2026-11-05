import { useEffect, useState } from 'react';

/**
 * Returns `value` once it has stopped changing for `delayMs`. Values for which `flushWhen(value)`
 * is true (e.g. a cleared search) apply at once, so a stale value can't linger after them.
 */
export function useDebounce(value, delayMs = 300, { flushWhen } = {}) {
  const [debounced, setDebounced] = useState(value);
  // Adjusting state during render (not in an effect), as React recommends.
  if (flushWhen?.(value) && !Object.is(debounced, value)) setDebounced(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
