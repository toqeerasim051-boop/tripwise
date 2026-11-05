// @vitest-environment node
import { mergeWishlist, sanitizeWishlist, wishlistReducer } from './wishlist.js';

const AT = '2026-10-27T12:00:00.000Z';

describe('sanitizeWishlist', () => {
  it('keeps valid entries and drops malformed or duplicate ones', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      sanitizeWishlist([
        { countryCode: 'FRA', addedAt: AT, extra: 'ignored' },
        { countryCode: 'fra', addedAt: AT },
        { countryCode: 'JPN', addedAt: 'not a date' },
        { countryCode: 'FRA', addedAt: AT },
        null,
        'DEU',
        { countryCode: 'DEU', addedAt: AT },
      ]),
    ).toEqual([
      { countryCode: 'FRA', addedAt: AT },
      { countryCode: 'DEU', addedAt: AT },
    ]);
    expect(console.warn).toHaveBeenCalledWith('wishlist: dropped 5 invalid entries');
  });

  it('returns [] for non-arrays', () => {
    expect(sanitizeWishlist({})).toEqual([]);
    expect(sanitizeWishlist(null)).toEqual([]);
  });
});

describe('wishlistReducer', () => {
  const state = [{ countryCode: 'FRA', addedAt: AT }];

  it('adds newest first and ignores duplicates or invalid codes', () => {
    const next = wishlistReducer(state, { type: 'add', countryCode: 'JPN', addedAt: AT });
    expect(next.map((item) => item.countryCode)).toEqual(['JPN', 'FRA']);
    expect(wishlistReducer(state, { type: 'add', countryCode: 'FRA', addedAt: AT })).toBe(state);
    expect(wishlistReducer(state, { type: 'add', countryCode: 'fr', addedAt: AT })).toBe(state);
  });

  it('removes items and returns the same state when absent', () => {
    expect(wishlistReducer(state, { type: 'remove', countryCode: 'FRA' })).toEqual([]);
    expect(wishlistReducer(state, { type: 'remove', countryCode: 'JPN' })).toBe(state);
  });

  it('replaces the whole list', () => {
    const items = [{ countryCode: 'DEU', addedAt: AT }];
    expect(wishlistReducer(state, { type: 'replace', items })).toBe(items);
  });

  it('throws on unknown actions', () => {
    expect(() => wishlistReducer(state, { type: 'nope' })).toThrow(/Unknown/);
  });
});

describe('mergeWishlist', () => {
  const current = [{ countryCode: 'FRA', addedAt: '2026-06-01T00:00:00.000Z' }];

  it('adds unsaved destinations, newest first', () => {
    expect(
      mergeWishlist(current, [
        { countryCode: 'FRA', addedAt: '2026-09-01T00:00:00.000Z' },
        { countryCode: 'JPN', addedAt: '2026-07-01T00:00:00.000Z' },
        { countryCode: 'DEU', addedAt: '2026-01-01T00:00:00.000Z' },
      ]),
    ).toEqual([
      { countryCode: 'JPN', addedAt: '2026-07-01T00:00:00.000Z' },
      { countryCode: 'FRA', addedAt: '2026-06-01T00:00:00.000Z' },
      { countryCode: 'DEU', addedAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('returns the same array when nothing is new, also through the reducer', () => {
    expect(mergeWishlist(current, current)).toBe(current);
    expect(wishlistReducer(current, { type: 'import', items: [] })).toBe(current);
  });
});
