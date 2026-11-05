/**
 * The only module that touches localStorage. Every access is wrapped because storage can be
 * disabled (private mode, blocked site data), full, or contain corrupt or foreign JSON.
 * Values are stored as { version, data } envelopes.
 */

export const STORAGE_VERSION = 1;

export const STORAGE_KEYS = {
  trips: 'tripwise:v1:trips',
  wishlist: 'tripwise:v1:wishlist',
  settings: 'tripwise:v1:settings',
};

/**
 * migrations[n] upgrades data from version n to n + 1. Add an entry whenever
 * STORAGE_VERSION is bumped; never silently drop old data.
 */
const migrations = {};

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // accessing localStorage itself can throw a SecurityError
  }
}

function isQuotaError(error) {
  return (
    error?.name === 'QuotaExceededError' ||
    error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error?.code === 22 ||
    error?.code === 1014
  );
}

/** Keeps unreadable data under a backup key so a later save can't destroy it. */
function backupRaw(storage, key, raw) {
  try {
    const backupKey = `${key}:backup`;
    if (storage.getItem(backupKey) === null) storage.setItem(backupKey, raw);
  } catch {
    // Best effort only.
  }
}

function migrate(envelope, key) {
  let { version, data } = envelope;
  while (version < STORAGE_VERSION) {
    const step = migrations[version];
    if (!step) throw new Error(`No migration from version ${version} for "${key}"`);
    data = step(data);
    version += 1;
  }
  return data;
}

/** Turns a raw stored string into data, or returns `fallback` (backing up what it couldn't read). */
function decode(storage, key, raw, fallback) {
  if (raw === null) return fallback;

  try {
    const envelope = JSON.parse(raw);
    if (!envelope || typeof envelope !== 'object' || !Number.isInteger(envelope.version)) {
      throw new Error('Missing version envelope');
    }
    if (envelope.version > STORAGE_VERSION) {
      throw new Error(`Stored version ${envelope.version} is newer than ${STORAGE_VERSION}`);
    }
    return migrate(envelope, key);
  } catch (error) {
    console.warn(`storage: could not read "${key}", using defaults`, error);
    if (storage) backupRaw(storage, key, raw);
    return fallback;
  }
}

/** Reads a value. Domain validation of the returned data is the caller's job. */
export function load(key, fallback) {
  const storage = getStorage();
  if (!storage) return fallback;

  let raw;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    console.warn(`storage: could not access "${key}"`, error);
    return fallback;
  }
  return decode(storage, key, raw, fallback);
}

/**
 * Writes a value. Never throws.
 * @returns {{ ok: true } | { ok: false, reason: 'quota' | 'unavailable' }}
 */
export function save(key, data) {
  const storage = getStorage();
  if (!storage) {
    setSaveFailure(key, 'unavailable');
    return { ok: false, reason: 'unavailable' };
  }

  try {
    storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, data }));
    setSaveFailure(key, null);
    return { ok: true };
  } catch (error) {
    console.error(`storage: could not save "${key}"`, error);
    const reason = isQuotaError(error) ? 'quota' : 'unavailable';
    setSaveFailure(key, reason);
    return { ok: false, reason };
  }
}

// ---------- save-failure status (read in React via useSyncExternalStore) ----------

let saveFailures = {}; // key -> 'quota' | 'unavailable'; replaced (never mutated) on change
const saveFailureListeners = new Set();

function setSaveFailure(key, reason) {
  if ((saveFailures[key] ?? null) === reason) return;
  const next = { ...saveFailures };
  if (reason) next[key] = reason;
  else delete next[key];
  saveFailures = next;
  saveFailureListeners.forEach((listener) => listener());
}

/** Snapshot of keys whose last save failed. Stable reference until something changes. */
export function getSaveFailures() {
  return saveFailures;
}

export function subscribeToSaveFailures(listener) {
  saveFailureListeners.add(listener);
  return () => saveFailureListeners.delete(listener);
}

export function remove(key) {
  const storage = getStorage();
  try {
    storage?.removeItem(key);
  } catch (error) {
    console.warn(`storage: could not remove "${key}"`, error);
  }
}

/**
 * Calls `onChange(data)` when another tab changes `key` (`fallback` when it's cleared or
 * unreadable). Returns an unsubscribe function.
 */
export function subscribe(key, onChange, fallback) {
  const handleStorage = (event) => {
    if (event.key !== null && event.key !== key) return;
    const storage = getStorage();
    if (event.storageArea && event.storageArea !== storage) return;
    // event.key === null means storage.clear() was called in another tab.
    onChange(event.key === null ? fallback : decode(storage, key, event.newValue, fallback));
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

// ---------- API cache ----------
// Normalised API data (never raw responses) kept between visits so pages open without waiting.
// Unlike user data, the cache is optional: failures are ignored and never shown as a warning.

const CACHE_PREFIX = 'tripwise:cache:';
/** Expired entries are kept this long as an offline fallback ("stale-if-error"). */
export const KEEP_STALE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * { data, expiresAt, stale } for a cached entry, or null when it is missing, expired, unreadable
 * or fails `isValid(data)`. With `allowStale`, an expired entry still kept as an offline fallback
 * is returned with `stale: true`.
 */
export function loadCached(name, isValid, now = Date.now(), { allowStale = false } = {}) {
  const storage = getStorage();
  try {
    const entry = JSON.parse(storage?.getItem(CACHE_PREFIX + name) ?? 'null');
    if (!entry || typeof entry.expiresAt !== 'number') return null;
    const stale = entry.expiresAt <= now;
    if (stale && (!allowStale || entry.expiresAt + KEEP_STALE_MS <= now)) return null;
    return isValid(entry.data) ? { data: entry.data, expiresAt: entry.expiresAt, stale } : null;
  } catch {
    return null;
  }
}

function readExpiry(raw) {
  try {
    return JSON.parse(raw)?.expiresAt;
  } catch {
    return undefined; // corrupt entry: treated as expired
  }
}

/** Caches `data` for `ttlMs`, first dropping entries expired for longer than KEEP_STALE_MS. */
export function saveCached(name, data, ttlMs, now = Date.now()) {
  const storage = getStorage();
  if (!storage) return;
  try {
    for (const key of Object.keys(storage)) {
      if (!key.startsWith(CACHE_PREFIX)) continue;
      if (!(readExpiry(storage.getItem(key)) + KEEP_STALE_MS > now)) storage.removeItem(key);
    }
    storage.setItem(CACHE_PREFIX + name, JSON.stringify({ expiresAt: now + ttlMs, data }));
  } catch {
    // Full or blocked storage: the app works without the cache.
  }
}

/** Removes cached entries whose name starts with `namePrefix` ('' clears the whole cache). */
export function clearCached(namePrefix = '') {
  const storage = getStorage();
  try {
    for (const key of Object.keys(storage ?? {})) {
      if (key.startsWith(CACHE_PREFIX + namePrefix)) storage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
