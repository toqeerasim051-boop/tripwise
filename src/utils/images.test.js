// @vitest-environment node
import { coverWebpSrcSet, heroWebpSrcSet, toWebp } from './images.js';

describe('toWebp', () => {
  it('maps our own JPEGs to their WebP companion', () => {
    expect(toWebp('/images/attractions/fra/eiffel-tower-500.jpg')).toBe(
      '/images/attractions/fra/eiffel-tower-500.webp',
    );
    expect(toWebp('/images/a.JPEG')).toBe('/images/a.webp');
  });

  it('ignores external URLs, other formats and missing values', () => {
    expect(toWebp('https://flagcdn.com/fr.jpg')).toBeNull();
    expect(toWebp('/images/flag.svg')).toBeNull();
    expect(toWebp(undefined)).toBeNull();
  });
});

describe('heroWebpSrcSet', () => {
  it('lists the smaller widths and the original', () => {
    expect(heroWebpSrcSet('/images/attractions/hero-lake.jpg')).toBe(
      '/images/attractions/hero-lake-960.webp 960w, /images/attractions/hero-lake-1280.webp 1280w, /images/attractions/hero-lake.webp 1920w',
    );
    expect(heroWebpSrcSet(null)).toBeNull();
  });
});

describe('coverWebpSrcSet', () => {
  it('offers the card and large sizes, or null when one is missing', () => {
    expect(coverWebpSrcSet({ src: '/images/a-500.jpg', large: '/images/a-960.jpg' })).toBe(
      '/images/a-500.webp 500w, /images/a-960.webp 960w',
    );
    expect(coverWebpSrcSet({ src: '/images/a-500.jpg' })).toBeNull();
    expect(coverWebpSrcSet(null)).toBeNull();
  });
});
