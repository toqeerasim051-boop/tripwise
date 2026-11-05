import { useState } from 'react';
import { toWebp } from '../../utils/images.js';

/**
 * An <img> that renders `fallback` instead when there is no `src` or the image fails to load,
 * so a missing photo never leaves a broken-image icon. Callers set a background for the loading moment.
 * Our own JPEGs are served as WebP (smaller) with the JPEG as the fallback; `webpSrcSet` + `sizes`
 * offer several widths (e.g. the full-screen hero) so phones download a smaller file.
 */
export default function Photo({
  src,
  alt,
  className = '',
  fallback = null,
  eager = false,
  webpSrcSet,
  sizes,
}) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) return fallback;

  const webp = webpSrcSet ?? toWebp(src);
  const img = (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={`object-cover ${className}`}
    />
  );
  if (!webp) return img;

  // `contents` keeps <picture> out of the layout, so the <img> classes work as before.
  return (
    <picture className="contents">
      <source type="image/webp" srcSet={webp} sizes={sizes} />
      {img}
    </picture>
  );
}
