/** WebP companions of our self-hosted JPEGs, created by `npm run images:webp`. Pure. */

/** "/images/x.jpg" -> "/images/x.webp" for our own photos; null for anything else. */
export function toWebp(src) {
  return typeof src === 'string' && src.startsWith('/images/') && /\.jpe?g$/i.test(src)
    ? src.replace(/\.jpe?g$/i, '.webp')
    : null;
}

/** Widths generated for hero photos (files named hero-*), besides the original. */
export const HERO_WIDTHS = [960, 1280];

/** srcset for a full-screen hero photo: the smaller WebP widths plus the original (1920px). */
export function heroWebpSrcSet(src, originalWidth = 1920) {
  const webp = toWebp(src);
  if (!webp) return null;
  const base = webp.replace(/\.webp$/, '');
  return [
    ...HERO_WIDTHS.map((width) => `${base}-${width}.webp ${width}w`),
    `${webp} ${originalWidth}w`,
  ].join(', ');
}

/** srcset for a country cover: the card (500px) and large (960px) WebP versions. */
export function coverWebpSrcSet(cover) {
  const small = toWebp(cover?.src);
  const large = toWebp(cover?.large);
  if (!small || !large) return null;
  return `${small} 500w, ${large} 960w`;
}
