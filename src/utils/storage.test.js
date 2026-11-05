import {
  KEEP_STALE_MS,
  clearCached,
  loadCached,
  saveCached,
  STORAGE_KEYS,
  STORAGE_VERSION,
  getSaveFailures,
  load,
  remove,
  save,
  subscribe,
  subscribeToSaveFailures,
} from './storage.js';

const KEY = STORAGE_KEYS.trips;

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('save / load', () => {
  it('round-trips data inside a version envelope', () => {
    expect(save(KEY, [{ id: 'a' }])).toEqual({ ok: true });
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({
      version: STORAGE_VERSION,
      data: [{ id: 'a' }],
    });
    expect(load(KEY, [])).toEqual([{ id: 'a' }]);
  });

  it('returns the fallback for missing keys', () => {
    expect(load(KEY, ['fallback'])).toEqual(['fallback']);
  });

  it.each([
    ['corrupt JSON', '{not json'],
    ['missing envelope', JSON.stringify([{ id: 'a' }])],
    ['newer version', JSON.stringify({ version: STORAGE_VERSION + 1, data: [] })],
    ['older version without migration', JSON.stringify({ version: 0, data: [] })],
  ])('falls back and backs up raw data on %s', (_label, raw) => {
    localStorage.setItem(KEY, raw);

    expect(load(KEY, [])).toEqual([]);
    expect(localStorage.getItem(`${KEY}:backup`)).toBe(raw);
    expect(console.warn).toHaveBeenCalled();
  });

  it('does not overwrite an existing backup', () => {
    localStorage.setItem(`${KEY}:backup`, 'first');
    localStorage.setItem(KEY, '{bad');
    load(KEY, []);
    expect(localStorage.getItem(`${KEY}:backup`)).toBe('first');
  });

  it('reports quota errors without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(save(KEY, [])).toEqual({ ok: false, reason: 'quota' });
  });

  it('reports other write errors as unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(save(KEY, [])).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('falls back when reading throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(load(KEY, 'fallback')).toBe('fallback');
  });

  it('handles localStorage being inaccessible entirely', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    expect(load(KEY, 'fallback')).toBe('fallback');
    expect(save(KEY, [])).toEqual({ ok: false, reason: 'unavailable' });
    expect(() => remove(KEY)).not.toThrow();
  });

  it('removes keys', () => {
    save(KEY, []);
    remove(KEY);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('save failure status', () => {
  it('records failures per key, notifies listeners and clears on the next successful save', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSaveFailures(listener);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    save(KEY, []);
    const failed = getSaveFailures();
    expect(failed).toEqual({ [KEY]: 'quota' });
    save(KEY, []);
    expect(getSaveFailures()).toBe(failed); // unchanged -> same snapshot
    expect(listener).toHaveBeenCalledTimes(1);

    setItem.mockRestore();
    save(KEY, []);
    expect(getSaveFailures()).toEqual({});
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});

describe('subscribe', () => {
  function dispatch(init) {
    window.dispatchEvent(new StorageEvent('storage', { storageArea: localStorage, ...init }));
  }

  it('notifies with decoded data for changes to its key from other tabs', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribe(KEY, onChange, []);

    dispatch({ key: KEY, newValue: JSON.stringify({ version: STORAGE_VERSION, data: [1] }) });
    dispatch({ key: 'other-key', newValue: 'x' });
    dispatch({ key: KEY, newValue: null });
    dispatch({ key: null }); // storage.clear() in another tab

    expect(onChange.mock.calls).toEqual([[[1]], [[]], [[]]]);

    unsubscribe();
    dispatch({ key: KEY, newValue: null });
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});

describe('API cache', () => {
  const isList = Array.isArray;
  const keys = () => Object.keys(localStorage).sort();

  it('loads saved data until it expires', () => {
    saveCached('countries', ['FRA'], 1000, 0);
    expect(loadCached('countries', isList, 999)).toEqual({
      data: ['FRA'],
      expiresAt: 1000,
      stale: false,
    });
    expect(loadCached('countries', isList, 1000)).toBeNull();
    expect(loadCached('missing', isList, 0)).toBeNull();
  });

  it('rejects data that fails validation or is corrupt', () => {
    saveCached('countries', { not: 'a list' }, 1000, 0);
    expect(loadCached('countries', isList, 1)).toBeNull();
    localStorage.setItem('tripwise:cache:broken', '{oops');
    expect(loadCached('broken', isList, 1)).toBeNull();
  });

  it('keeps expired entries as an offline fallback for KEEP_STALE_MS', () => {
    saveCached('countries', ['FRA'], 1000, 0);
    expect(loadCached('countries', isList, 5000, { allowStale: true })).toEqual({
      data: ['FRA'],
      expiresAt: 1000,
      stale: true,
    });
    expect(loadCached('countries', isList, 1000 + KEEP_STALE_MS, { allowStale: true })).toBeNull();
  });

  it('drops long-expired and corrupt entries when saving, and never touches user data', () => {
    localStorage.setItem('tripwise:v1:trips', '{"version":1,"data":[]}');
    saveCached('weather:old', {}, 10, 0);
    saveCached('weather:recent', {}, 10, 50);
    localStorage.setItem('tripwise:cache:broken', '{oops');
    saveCached('weather:new', {}, 1000, KEEP_STALE_MS + 20);
    expect(keys()).toEqual([
      'tripwise:cache:weather:new',
      'tripwise:cache:weather:recent',
      'tripwise:v1:trips',
    ]);
  });

  it('clears entries by name prefix', () => {
    saveCached('country:FRA', {}, 1000, 0);
    saveCached('country:JPN', {}, 1000, 0);
    saveCached('weather:1,2', {}, 1000, 0);
    clearCached('country:');
    expect(keys()).toEqual(['tripwise:cache:weather:1,2']);
    clearCached();
    expect(keys()).toEqual([]);
  });

  it('ignores full storage without reporting a save failure', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => saveCached('countries', ['FRA'], 1000, 0)).not.toThrow();
    expect(getSaveFailures()).toEqual({});
  });
});
