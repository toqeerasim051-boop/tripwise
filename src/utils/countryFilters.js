/** Pure search / filter / sort logic for the Explore page. */

export const POPULATION_RANGES = [
  { value: 'any', label: 'Any population' },
  { value: 'lt1m', label: 'Under 1 million', max: 1_000_000 },
  { value: '1m-10m', label: '1 – 10 million', min: 1_000_000, max: 10_000_000 },
  { value: '10m-100m', label: '10 – 100 million', min: 10_000_000, max: 100_000_000 },
  { value: 'gt100m', label: 'Over 100 million', min: 100_000_000 },
];

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'population-desc', label: 'Population (high to low)' },
  { value: 'population-asc', label: 'Population (low to high)' },
];

export const DEFAULT_FILTERS = { query: '', region: 'all', population: 'any', sort: 'featured' };

/** Lowercase and strip accents so "cote" matches "Côte d'Ivoire". */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function getRegions(countries) {
  return [...new Set(countries.map((country) => country.region))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Coerces untrusted values (e.g. from the URL) into valid filters. */
export function sanitizeFilters({ query, region, population, sort } = {}, regions = []) {
  return {
    query: typeof query === 'string' ? query : DEFAULT_FILTERS.query,
    region: regions.includes(region) ? region : DEFAULT_FILTERS.region,
    population: POPULATION_RANGES.some((range) => range.value === population)
      ? population
      : DEFAULT_FILTERS.population,
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : DEFAULT_FILTERS.sort,
  };
}

function matchesQuery(country, query) {
  if (!query) return true;
  return [country.name, country.officialName, country.capital, country.code].some((field) =>
    normalizeSearchText(field).includes(query),
  );
}

function matchesPopulation(country, rangeValue) {
  const range = POPULATION_RANGES.find((option) => option.value === rangeValue);
  if (!range || range.value === 'any') return true;
  if (country.population === null) return false;
  return (
    (range.min === undefined || country.population >= range.min) &&
    (range.max === undefined || country.population < range.max)
  );
}

const compareName = (a, b) => a.name.localeCompare(b.name);

/** Unknown populations always sort last, whichever direction. */
function comparePopulation(direction) {
  return (a, b) => {
    if (a.population === null || b.population === null) {
      return (a.population === null) - (b.population === null) || compareName(a, b);
    }
    return direction * (a.population - b.population) || compareName(a, b);
  };
}

const COMPARATORS = {
  'name-asc': compareName,
  'name-desc': (a, b) => compareName(b, a),
  'population-desc': comparePopulation(-1),
  'population-asc': comparePopulation(1),
};

/** Curated destinations first (in `featuredOrder`), then everyone else by name. */
function compareFeatured(featuredOrder) {
  const rank = new Map(featuredOrder.map((code, index) => [code, index]));
  const rankOf = (country) => rank.get(country.code) ?? Infinity;
  return (a, b) => rankOf(a) - rankOf(b) || compareName(a, b);
}

/**
 * Returns a new filtered and sorted array; never mutates `countries`.
 * `featuredOrder` (country codes) drives the 'featured' sort.
 */
export function filterAndSortCountries(countries, filters, { featuredOrder = [] } = {}) {
  const { query, region, population, sort } = { ...DEFAULT_FILTERS, ...filters };
  const normalizedQuery = normalizeSearchText(query);

  return countries
    .filter(
      (country) =>
        (region === 'all' || country.region === region) &&
        matchesPopulation(country, population) &&
        matchesQuery(country, normalizedQuery),
    )
    .sort(
      sort === 'featured' ? compareFeatured(featuredOrder) : (COMPARATORS[sort] ?? compareName),
    );
}

export function hasActiveFilters(filters) {
  return (
    normalizeSearchText(filters.query) !== '' ||
    filters.region !== DEFAULT_FILTERS.region ||
    filters.population !== DEFAULT_FILTERS.population
  );
}
