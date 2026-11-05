import { useCallback, useEffect, useState } from 'react';
import { isAbortError } from '../services/http.js';

const IDLE = { status: 'idle', data: undefined, error: null };

/**
 * Loads `loader(key, signal)` whenever `key` changes and returns { data, status, error, retry }.
 * - `key === null` means "nothing to load" (status 'idle').
 * - `loader` must be stable (a module-level function), so effects don't re-run every render.
 * - In-flight requests are aborted on key change and unmount; aborts are never reported.
 * - 'loading' is derived (no stored result for the current request yet), so no state is set
 *   synchronously inside the effect.
 */
export function useAsyncResource(key, loader) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ requestId: null, ...IDLE });
  const requestId = key === null ? null : `${key}#${attempt}`;

  useEffect(() => {
    if (key === null) return undefined;
    const id = `${key}#${attempt}`;
    const controller = new AbortController();

    loader(key, controller.signal).then(
      (data) => setResult({ requestId: id, status: 'success', data, error: null }),
      (error) => {
        if (isAbortError(error)) return;
        console.error(error);
        setResult({ requestId: id, status: 'error', data: undefined, error });
      },
    );
    return () => controller.abort();
  }, [key, attempt, loader]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  if (requestId === null) return { ...IDLE, retry };
  if (result.requestId !== requestId)
    return { status: 'loading', data: undefined, error: null, retry };
  return { status: result.status, data: result.data, error: result.error, retry };
}
