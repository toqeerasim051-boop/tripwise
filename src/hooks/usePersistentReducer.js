import { useEffect, useReducer, useRef } from 'react';
import { load, save, subscribe } from '../utils/storage.js';

/**
 * useReducer backed by localStorage:
 * - initial state = sanitize(stored data)
 * - every change is saved (failures surface through useStorageStatus)
 * - changes from other tabs are sanitised and applied via `replaceAction(data)`
 *
 * State that just came *from* storage (initial load, other tab) is not written back, so a
 * failing write on start-up can't raise a "changes not saved" warning for unchanged data.
 * `reducer`, `sanitize` and `replaceAction` must be stable (module-level) functions.
 */
export function usePersistentReducer(key, reducer, { sanitize, replaceAction }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => sanitize(load(key, [])));
  const lastPersisted = useRef(state);

  useEffect(() => {
    if (state === lastPersisted.current) return;
    lastPersisted.current = state;
    save(key, state);
  }, [key, state]);

  useEffect(
    () =>
      subscribe(
        key,
        (data) => {
          const next = sanitize(data);
          lastPersisted.current = next;
          dispatch(replaceAction(next));
        },
        [],
      ),
    [key, sanitize, replaceAction],
  );

  return [state, dispatch];
}
