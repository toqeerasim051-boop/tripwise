import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * Moves focus to the first <h1> inside `containerRef` whenever the pathname changes,
 * so screen-reader and keyboard users land on the new page's heading.
 * The initial page load is skipped (StrictMode-safe via the previous-pathname ref).
 */
export function useRouteFocus(containerRef) {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    const heading = containerRef.current?.querySelector('h1');
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus();
  }, [pathname, containerRef]);
}
