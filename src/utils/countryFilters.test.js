// @vitest-environment node
import {
  filterAndSortCountries,
  getRegions,
  hasActiveFilters,
  normalizeSearchText,
  sanitizeFilters,
} from './countryFilters.js';
import { allCountries, france, japan, tuvalu } from '../test/fixtures.js';

const names = (countries) => countries.map((country) => country.name);

describe('normalizeSearchText', () => {
  it('lowercases, trims and strips accents', () => {
    expect(normalizeSearchText('  Côte d’Ivoire ')).toBe('cote d’ivoire');
    expect(normalizeSearchText(null)).toBe('');
  });
});

describe('getRegions', () => {
  it('returns unique sorted regions', () => {
    expect(getRegions(allCountries)).toEqual(['Africa', 'Asia', 'Europe', 'Oceania']);
  });
});

describe('sanitizeFilters', () => {
  it('replaces unknown values with defaults', () => {
    expect(
      sanitizeFilters({ query: 5, region: 'Mars', population: 'huge', sort: 'random' }, ['Europe']),
    ).toEqual({ query: '', region: 'all', population: 'any', sort: 'featured' });
  });

  it('keeps valid values', () => {
    expect(
      sanitizeFilters(
        { query: 'fr', region: 'Europe', population: 'gt100m', sort: 'population-desc' },
        ['Europe'],
      ),
    ).toEqual({ query: 'fr', region: 'Europe', population: 'gt100m', sort: 'population-desc' });
  });
});

describe('filterAndSortCountries', () => {
  it('returns everything sorted by name by default without mutating input', () => {
    const input = [...allCountries].reverse();
    const result = filterAndSortCountries(input, {});
    expect(names(result)).toEqual(names(allCountries));
    expect(input[0]).toBe(allCountries.at(-1));
  });

  it.each([
    ['cote', ["Côte d'Ivoire"]], // accent-insensitive
    ['FRENCH REP', ['France']], // official name
    ['tokyo', ['Japan']], // capital
    ['tuv', ['Tuvalu']], // code / name
    ['zzz', []],
  ])('searches %s', (query, expected) => {
    expect(names(filterAndSortCountries(allCountries, { query }))).toEqual(expected);
  });

  it('filters by region', () => {
    expect(names(filterAndSortCountries(allCountries, { region: 'Europe' }))).toEqual([
      'Belgium',
      'France',
      'Germany',
    ]);
  });

  it.each([
    ['lt1m', ['Tuvalu']],
    ['1m-10m', []],
    ['10m-100m', ['Belgium', "Côte d'Ivoire", 'France', 'Germany']],
    ['gt100m', ['Japan']],
  ])('filters population %s', (population, expected) => {
    expect(names(filterAndSortCountries(allCountries, { population }))).toEqual(expected);
  });

  it('excludes unknown populations from ranges but sorts them last', () => {
    const unknown = { ...france, code: 'XXX', name: 'Atlantis', population: null };
    const list = [unknown, japan, tuvalu];
    expect(filterAndSortCountries(list, { population: 'lt1m' })).toEqual([tuvalu]);
    expect(names(filterAndSortCountries(list, { sort: 'population-desc' }))).toEqual([
      'Japan',
      'Tuvalu',
      'Atlantis',
    ]);
    expect(names(filterAndSortCountries(list, { sort: 'population-asc' }))).toEqual([
      'Tuvalu',
      'Japan',
      'Atlantis',
    ]);
  });

  it('sorts by name descending', () => {
    expect(names(filterAndSortCountries(allCountries, { sort: 'name-desc' }))[0]).toBe('Tuvalu');
  });

  it('combines filters', () => {
    expect(
      names(
        filterAndSortCountries(allCountries, {
          region: 'Europe',
          population: '10m-100m',
          query: 'an',
          sort: 'population-desc',
        }),
      ),
    ).toEqual(['Germany', 'France']);
  });
});

describe('hasActiveFilters', () => {
  it('ignores sort and whitespace-only queries', () => {
    expect(
      hasActiveFilters({ query: '  ', region: 'all', population: 'any', sort: 'name-desc' }),
    ).toBe(false);
    expect(hasActiveFilters({ query: 'x', region: 'all', population: 'any' })).toBe(true);
    expect(hasActiveFilters({ query: '', region: 'Asia', population: 'any' })).toBe(true);
  });
});
