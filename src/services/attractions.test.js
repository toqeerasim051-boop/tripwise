// @vitest-environment node
// Checks the real generated data (setup.js mocks this service for every other test).
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import attractionsData from '../data/attractions.json';
import destinationsData from '../data/destinations.json';
import { coverWebpSrcSet, heroWebpSrcSet, toWebp } from '../utils/images.js';

vi.unmock('./attractions.js');
const {
  getAttractions,
  getCoverPhoto,
  getCuratedCountries,
  getCuratedCountry,
  getDestinations,
  getSnapshotNeighbours,
} = await import('./attractions.js');

const PUBLIC = new URL('../../public/', import.meta.url);
const photoExists = (src) => existsSync(fileURLToPath(new URL(src.slice(1), PUBLIC)));
const isHttps = (url) => typeof url === 'string' && url.startsWith('https://');

function expectValidImage(image) {
  expect(image.src).toMatch(/^\/images\/attractions\/.+\.jpg$/);
  expect(photoExists(image.src), `missing file for ${image.src}`).toBe(true);
  expect(
    photoExists(toWebp(image.src)),
    `missing WebP for ${image.src} (npm run images:webp)`,
  ).toBe(true);
  if (image.large) {
    expect(photoExists(image.large), `missing file for ${image.large}`).toBe(true);
    expect(photoExists(toWebp(image.large)), `missing WebP for ${image.large}`).toBe(true);
  }
  expect(image.credit.artist).toEqual(expect.any(String));
  expect(image.credit.license).toEqual(expect.any(String));
  expect(isHttps(image.credit.filePage)).toBe(true);
}

describe('attractions.json', () => {
  const entries = Object.entries(attractionsData.countries);

  it('covers dozens of countries with several attractions each', () => {
    expect(entries.length).toBeGreaterThanOrEqual(40);
    entries.forEach(([code, list]) => {
      expect(code).toMatch(/^[A-Z]{3}$/);
      expect(list.length, code).toBeGreaterThanOrEqual(3);
    });
  });

  it('has complete, unique attractions with valid links, coordinates and local photos', () => {
    entries.forEach(([code, list]) => {
      const ids = new Set();
      list.forEach((item) => {
        expect(ids.has(item.id), `${code}: duplicate ${item.id}`).toBe(false);
        ids.add(item.id);
        expect(item.name.trim()).not.toBe('');
        expect(item.place.trim()).not.toBe('');
        expect(item.description.length, `${code}: ${item.name}`).toBeGreaterThan(20);
        expect(item.wikipediaUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
        if (item.lat !== null) {
          expect(Math.abs(item.lat)).toBeLessThanOrEqual(90);
          expect(Math.abs(item.lon)).toBeLessThanOrEqual(180);
        }
        if (item.image) expectValidImage(item.image);
      });
    });
  });

  it('has a photo for most attractions', () => {
    const all = entries.flatMap(([, list]) => list);
    expect(all.filter((item) => item.image).length / all.length).toBeGreaterThan(0.8);
  });
});

describe('destinations.json', () => {
  it('has a hero photo and covers that exist on disk', () => {
    expect(destinationsData.hero).not.toBeNull();
    expect(photoExists(destinationsData.hero.src)).toBe(true);
    const srcFiles = (srcSet) => srcSet.split(', ').map((entry) => entry.split(' ')[0]);
    for (const file of srcFiles(heroWebpSrcSet(destinationsData.hero.src))) {
      expect(photoExists(file), `missing hero WebP ${file}`).toBe(true);
    }
    Object.values(destinationsData.covers).forEach((cover) => {
      expectValidImage(cover);
      expect(coverWebpSrcSet(cover)).toBeTruthy();
    });
  });

  it('lists only curated countries as featured, without duplicates', () => {
    const { featured } = destinationsData;
    expect(new Set(featured).size).toBe(featured.length);
    featured.forEach((code) => expect(attractionsData.countries[code]).toBeDefined());
  });
});

describe('curated-countries.json', () => {
  it('has a country summary for every destination with a cover photo', () => {
    const countries = getCuratedCountries();
    expect(countries.map((country) => country.code).sort()).toEqual(
      Object.keys(destinationsData.covers).sort(),
    );
    for (const country of countries) {
      expect(country.name).toBeTruthy();
      expect(country.region).toBeTruthy();
      expect(country.flagUrl).toMatch(/^https:/);
    }
  });

  it('has the details a country page needs, and every neighbour, so curated pages need no request', () => {
    for (const country of getCuratedCountries()) {
      expect(getCuratedCountry(country.code.toLowerCase())).toBe(country);
      expect(country.languages.length).toBeGreaterThan(0);
      expect(country.timezones.length).toBeGreaterThan(0);
      const neighbours = getSnapshotNeighbours(country.borders);
      expect(neighbours?.map((neighbour) => neighbour.code)).toEqual(country.borders);
      neighbours.forEach((neighbour) => {
        expect(neighbour.name).toBeTruthy();
        expect(neighbour.flagUrl).toMatch(/^https:/);
      });
    }
  });

  it('returns null for countries outside the snapshot', () => {
    expect(getCuratedCountry('ZZZ')).toBeNull();
    expect(getCuratedCountry(undefined)).toBeNull();
    expect(getSnapshotNeighbours(['FRA', 'ZZZ'])).toBeNull();
  });
});

describe('attractions service', () => {
  it('returns attractions by country code (any case), and [] for others', async () => {
    expect(await getAttractions('fra')).toBe(attractionsData.countries.FRA);
    expect(await getAttractions('XYZ')).toEqual([]);
  });

  it('returns cover photos and the destinations data', () => {
    expect(getCoverPhoto('jpn')).toBe(destinationsData.covers.JPN);
    expect(getCoverPhoto('XYZ')).toBeNull();
    expect(getCoverPhoto(undefined)).toBeNull();
    expect(getDestinations()).toBe(destinationsData);
  });
});
