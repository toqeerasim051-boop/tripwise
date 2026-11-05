import { useContext } from 'react';
import { WishlistContext } from '../context/WishlistContext.js';

/** { items, count, has(code), add(code), remove(code), toggle(code), importItems(items) } */
export function useWishlist() {
  const value = useContext(WishlistContext);
  if (!value) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return value;
}
