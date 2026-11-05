import { useEffect, useRef, useState } from 'react';

const canObserve = () => typeof IntersectionObserver !== 'undefined';

/**
 * Fades its content in (and slides it up when motion is allowed) the first time it scrolls into
 * view; styles are `.reveal` in index.css. Without IntersectionObserver (old browsers, tests) the
 * content shows at once. `as` sets the element (e.g. 'li', 'section'); `delay` (ms) staggers items.
 */
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', style, ...props }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => !canObserve());

  useEffect(() => {
    const element = ref.current;
    if (shown || !element) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setShown(true);
      },
      { rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      data-shown={shown || undefined}
      style={delay ? { ...style, '--reveal-delay': `${delay}ms` } : style}
      {...props}
    />
  );
}
