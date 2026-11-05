import { useCallback, useSyncExternalStore } from 'react';

/**
 * True while the CSS media `query` matches; updates when it changes (e.g. the phone is rotated).
 * Without `matchMedia` (old browsers, tests) it is false.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  );
}
