import { useAsyncResource } from './useAsyncResource.js';
import { getAllCountries, getCountry, getNeighbours } from '../services/restCountries.js';
import { getCuratedCountry, getSnapshotNeighbours } from '../services/attractions.js';

const loadAll = (_key, signal) => getAllCountries({ signal });
const loadOne = (code, signal) => getCountry(code, { signal });
const loadNeighbours = (codes, signal) => getNeighbours(codes.split(','), { signal });

/** All countries (summary shape), sorted by name. Idle (no request) while `enabled` is false. */
export function useCountries(enabled = true) {
  return useAsyncResource(enabled ? 'all' : null, loadAll);
}

/** One country (detail shape). Pass null/undefined to skip. 404s arrive as error.status === 404. */
// Curated countries (and their neighbours) come from the bundled snapshot: ready at once, with
// no request. Other countries are loaded from REST Countries.
export function useCountry(code) {
  const snapshot = code ? getCuratedCountry(code) : null;
  const result = useAsyncResource(code && !snapshot ? code.toUpperCase() : null, loadOne);
  if (snapshot) return { status: 'success', data: snapshot, error: null, retry: result.retry };
  return result;
}

/** Summaries for a list of border codes. Idle until codes are known; [] codes resolve to []. */
export function useNeighbours(borderCodes) {
  const key = Array.isArray(borderCodes) ? borderCodes.join(',') : null;
  const snapshot = key ? getSnapshotNeighbours(borderCodes) : null;
  const result = useAsyncResource(key && !snapshot ? key : null, loadNeighbours);
  if (key === '') return { status: 'success', data: [], error: null, retry: result.retry };
  if (snapshot) return { status: 'success', data: snapshot, error: null, retry: result.retry };
  return result;
}
