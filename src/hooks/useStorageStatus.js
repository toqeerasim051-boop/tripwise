import { useSyncExternalStore } from 'react';
import { getSaveFailures, subscribeToSaveFailures } from '../utils/storage.js';

/** { [storageKey]: 'quota' | 'unavailable' } for keys whose last save failed. */
export function useStorageStatus() {
  return useSyncExternalStore(subscribeToSaveFailures, getSaveFailures, getSaveFailures);
}
