/** Pure wishlist state logic. Items are { countryCode, addedAt }, newest first. */

const COUNTRY_CODE = /^[A-Z]{3}$/;

/** Drops malformed or duplicate entries from untrusted (stored) data. */
export function sanitizeWishlist(data) {
  if (!Array.isArray(data)) return [];

  const seen = new Set();
  const items = [];
  let dropped = 0;
  for (const item of data) {
    const valid =
      item &&
      typeof item.countryCode === 'string' &&
      COUNTRY_CODE.test(item.countryCode) &&
      typeof item.addedAt === 'string' &&
      !Number.isNaN(Date.parse(item.addedAt)) &&
      !seen.has(item.countryCode);
    if (valid) {
      seen.add(item.countryCode);
      items.push({ countryCode: item.countryCode, addedAt: item.addedAt });
    } else {
      dropped += 1;
    }
  }
  if (dropped > 0) console.warn(`wishlist: dropped ${dropped} invalid entries`);
  return items;
}

/**
 * Adds imported items (already sanitised) that aren't saved yet, keeping newest first.
 * Returns `current` itself when nothing changes.
 */
export function mergeWishlist(current, incoming) {
  const codes = new Set(current.map((item) => item.countryCode));
  const added = incoming.filter((item) => !codes.has(item.countryCode));
  if (added.length === 0) return current;
  return [...current, ...added].sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
}

/**
 * Actions: { type: 'add', countryCode, addedAt } | { type: 'remove', countryCode }
 *          | { type: 'replace', items }  (e.g. after a change in another tab)
 *          | { type: 'import', items }   (merged from a backup file)
 */
export function wishlistReducer(state, action) {
  switch (action.type) {
    case 'add':
      if (!COUNTRY_CODE.test(action.countryCode)) return state;
      if (state.some((item) => item.countryCode === action.countryCode)) return state;
      return [{ countryCode: action.countryCode, addedAt: action.addedAt }, ...state];
    case 'remove':
      return state.some((item) => item.countryCode === action.countryCode)
        ? state.filter((item) => item.countryCode !== action.countryCode)
        : state;
    case 'replace':
      return action.items;
    case 'import':
      return mergeWishlist(state, action.items);
    default:
      throw new Error(`Unknown wishlist action: ${action.type}`);
  }
}
