import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * True while the browser prints (Print button or Ctrl+P). The `beforeprint` update is flushed
 * synchronously, so print-only content is in the page before the browser takes its snapshot.
 */
export function usePrinting() {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  return printing;
}
