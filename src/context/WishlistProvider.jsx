import { useCallback, useMemo } from 'react';
import { WishlistContext } from './WishlistContext.js';
import { usePersistentReducer } from '../hooks/usePersistentReducer.js';
import { STORAGE_KEYS } from '../utils/storage.js';
import { sanitizeWishlist, wishlistReducer } from '../utils/wishlist.js';

const PERSISTENCE = {
  sanitize: sanitizeWishlist,
  replaceAction: (items) => ({ type: 'replace', items }),
};

export default function WishlistProvider({ children }) {
  const [items, dispatch] = usePersistentReducer(
    STORAGE_KEYS.wishlist,
    wishlistReducer,
    PERSISTENCE,
  );

  const add = useCallback(
    (countryCode) => dispatch({ type: 'add', countryCode, addedAt: new Date().toISOString() }),
    [dispatch],
  );
  const remove = useCallback(
    (countryCode) => dispatch({ type: 'remove', countryCode }),
    [dispatch],
  );

  const importItems = useCallback(
    (imported) => dispatch({ type: 'import', items: imported }),
    [dispatch],
  );

  const value = useMemo(() => {
    const codes = new Set(items.map((item) => item.countryCode));
    return {
      items,
      count: items.length,
      has: (countryCode) => codes.has(countryCode),
      add,
      remove,
      importItems,
      toggle: (countryCode) => (codes.has(countryCode) ? remove(countryCode) : add(countryCode)),
    };
  }, [items, add, remove, importItems]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
