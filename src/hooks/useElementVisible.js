import { useEffect, useState } from 'react';

/**
 * Whether the element with `id` is on screen below the sticky header (`topOffset` px).
 * `id` null = not watching. Without IntersectionObserver (old browsers, tests) it stays true.
 */
export function useElementVisible(id, topOffset = 72) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = id && document.getElementById(id);
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: `-${topOffset}px 0px 0px 0px`,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [id, topOffset]);

  return visible;
}
