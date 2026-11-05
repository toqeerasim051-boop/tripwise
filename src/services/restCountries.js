import { ApiError, getJson, isTemporaryError, withAbort } from './http.js';
import { clearCached, loadCached, saveCached } from '../utils/storage.js';

export const BASE_URL = 'https://api.restcountries.com/countries/v5';
const PAGE_LIMIT = 100; // free-plan maximum
const MAX_PAGES = 10; // safety stop; ~250 countries need 3 pages

export const LIST_FIELDS = [
  'names.common',
  'names.official',
  'codes.alpha_3',
  'flag.url_svg',
  'flag.url_png',
  'flag.description',
  'region',
  'subregion',
  'population',
  'capitals',
  'coordinates.lat',
  'coordinates.lng',
  'currencies',
  'area.kilometers',
];
export const DETAIL_FIELDS = [...LIST_FIELDS, 'languages', 'borders', 'timezones'];

const ALPHA3 = /^[A-Za-z]{3}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;

let listPromise = null;
const detailPromises = new Map();

/** Test helper: forget all cached responses. */
export function clearCountriesCache() {
  listPromise = null;
  detailPromises.clear();
  clearCached('countries');
  clearCached('country:');
}

/** Country data changes rarely, so the browser keeps it for a day between visits. */
const PERSIST_TTL_MS = 24 * 60 * 60 * 1000;
const isCountryList = (data) =>
  Array.isArray(data) && data.length > 0 && data.every((item) => item?.code && item?.name);
const isCountryDetail = (data) => Boolean(data?.code && data?.name);

/**
 * `fetcher()` unless a fresh copy is in the browser cache; fresh results are cached. When the
 * request fails for a temporary reason, an older cached copy is used instead (country facts
 * barely change, so it needs no label).
 */
function persisted(name, isValid, fetcher) {
  const cached = loadCached(name, isValid);
  if (cached) return Promise.resolve(cached.data);
  return fetcher().then(
    (data) => {
      saveCached(name, data, PERSIST_TTL_MS);
      return data;
    },
    (error) => {
      const stale =
        isTemporaryError(error) && loadCached(name, isValid, Date.now(), { allowStale: true });
      if (!stale) throw error;
      return stale.data;
    },
  );
}

function getApiKey() {
  const key = import.meta.env.VITE_RESTCOUNTRIES_API_KEY;
  if (!key) {
    throw new ApiError('VITE_RESTCOUNTRIES_API_KEY is not set (see .env.example)', {
      kind: 'config',
    });
  }
  return key;
}

async function request(path, params) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, String(value)));

  const body = await getJson(url.toString(), {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });

  // Deprecated versions answer 200 with { success: false, errors: [...] }; never trust status alone.
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    throw new ApiError(body.errors[0]?.message ?? 'REST Countries returned an error', {
      kind: 'api',
      url: url.toString(),
    });
  }
  if (!Array.isArray(body?.data?.objects)) {
    throw new ApiError('Unexpected REST Countries response shape', {
      kind: 'parse',
      url: url.toString(),
    });
  }
  return body.data;
}

// ---------- normalisers (raw v5 shape -> flat app objects) ----------

function toFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Accepts { lat, lng }, { latitude, longitude } or [lat, lng]; the v5 docs don't pin this down. */
function readCoordinates(raw) {
  if (!raw) return null;
  const [lat, lon] = Array.isArray(raw)
    ? raw.map(toFiniteNumber)
    : [
        toFiniteNumber(raw.lat ?? raw.latitude),
        toFiniteNumber(raw.lng ?? raw.lon ?? raw.longitude),
      ];
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

function isPrimaryCapital(capital) {
  const attributes = capital?.attributes;
  return Array.isArray(attributes) ? attributes.includes('primary') : attributes?.primary === true;
}

function pickCapital(capitals) {
  if (!Array.isArray(capitals) || capitals.length === 0) return null;
  const capital = capitals.find(isPrimaryCapital) ?? capitals[0];
  if (typeof capital === 'string') return { name: capital, coords: null };
  return {
    name: typeof capital?.name === 'string' ? capital.name : null,
    coords: readCoordinates(capital?.coordinates),
  };
}

/** Accepts { EUR: { name, symbol } } or [{ code, name, symbol }]. */
function normalizeCurrencies(raw) {
  const entries = Array.isArray(raw)
    ? raw.map((currency) => [currency?.code, currency])
    : Object.entries(raw && typeof raw === 'object' ? raw : {});

  return entries
    .filter(([code]) => typeof code === 'string' && CURRENCY_CODE.test(code))
    .map(([code, currency]) => ({
      code,
      name: typeof currency?.name === 'string' ? currency.name : code,
      symbol: typeof currency?.symbol === 'string' ? currency.symbol : null,
    }));
}

/** Accepts strings, { fra: 'French' } or objects carrying an English name. */
function normalizeLanguages(raw) {
  const list = Array.isArray(raw) ? raw : Object.values(raw && typeof raw === 'object' ? raw : {});
  return list
    .map((language) => {
      if (typeof language === 'string') return language;
      const candidate =
        language?.name_english ??
        language?.english_name ??
        language?.name?.english ??
        language?.english ??
        language?.name;
      return typeof candidate === 'string' ? candidate : null;
    })
    .filter(Boolean);
}

export function normalizeCountrySummary(raw) {
  const code = raw?.codes?.alpha_3;
  const name = raw?.names?.common;
  if (typeof code !== 'string' || !ALPHA3.test(code) || typeof name !== 'string' || !name) {
    return null;
  }

  const capital = pickCapital(raw.capitals);
  const countryCoords = readCoordinates(raw.coordinates);
  const coords = capital?.coords ?? countryCoords;

  return {
    code: code.toUpperCase(),
    name,
    officialName: typeof raw.names.official === 'string' ? raw.names.official : name,
    flagUrl: raw.flag?.url_svg || raw.flag?.url_png || null,
    flagAlt: raw.flag?.description || `Flag of ${name}`,
    region: raw.region || 'Other',
    subregion: raw.subregion || null,
    population: toFiniteNumber(raw.population),
    areaKm2: toFiniteNumber(raw.area?.kilometers),
    capital: capital?.name ?? null,
    lat: coords?.lat ?? null,
    lon: coords?.lon ?? null,
    // 'capital' -> weather for the capital; 'country' -> geographic centre; null -> hide weather
    coordsSource: capital?.coords ? 'capital' : countryCoords ? 'country' : null,
    currencies: normalizeCurrencies(raw.currencies),
  };
}

export function normalizeCountryDetail(raw) {
  const summary = normalizeCountrySummary(raw);
  if (!summary) return null;

  return {
    ...summary,
    languages: normalizeLanguages(raw.languages),
    timezones: Array.isArray(raw.timezones)
      ? raw.timezones.filter((zone) => typeof zone === 'string')
      : [],
    borders: Array.isArray(raw.borders)
      ? raw.borders
          .filter((code) => typeof code === 'string' && ALPHA3.test(code))
          .map((code) => code.toUpperCase())
      : [],
  };
}

// ---------- public API ----------

async function fetchAllCountries() {
  const rawCountries = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { objects, meta } = await request('', {
      response_fields: LIST_FIELDS.join(','),
      limit: PAGE_LIMIT,
      offset,
    });
    rawCountries.push(...objects);
    offset += objects.length;

    const total = toFiniteNumber(meta?.total);
    const hasMore = meta?.more ?? (total !== null && offset < total);
    if (!hasMore || objects.length === 0) break;
  }

  const byCode = new Map();
  for (const raw of rawCountries) {
    const country = normalizeCountrySummary(raw);
    if (country && !byCode.has(country.code)) byCode.set(country.code, country);
  }
  const dropped = rawCountries.length - byCode.size;
  if (dropped > 0) console.warn(`REST Countries: skipped ${dropped} invalid or duplicate entries`);

  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * All countries (summary shape), sorted by name. Fetched once per session and shared;
 * a failed fetch is not cached so `retry` works. `signal` only stops this caller waiting.
 */
export function getAllCountries({ signal } = {}) {
  if (!listPromise) {
    listPromise = persisted('countries', isCountryList, fetchAllCountries).catch((error) => {
      listPromise = null;
      throw error;
    });
  }
  return withAbort(listPromise, signal);
}

async function fetchCountry(code) {
  const { objects } = await request(`/codes.alpha_3/${code}`, {
    response_fields: DETAIL_FIELDS.join(','),
  });
  const country = objects.length > 0 ? normalizeCountryDetail(objects[0]) : null;
  if (!country) throw new ApiError(`Country ${code} not found`, { kind: 'http', status: 404 });
  return country;
}

/** One country (detail shape) by ISO alpha-3 code. Unknown codes reject with a 404 ApiError. */
export function getCountry(code, { signal } = {}) {
  if (typeof code !== 'string' || !ALPHA3.test(code)) {
    return Promise.reject(
      new ApiError(`Invalid country code: ${code}`, { kind: 'http', status: 404 }),
    );
  }
  const key = code.toUpperCase();

  if (!detailPromises.has(key)) {
    const promise = persisted(`country:${key}`, isCountryDetail, () => fetchCountry(key)).catch(
      (error) => {
        detailPromises.delete(key);
        throw error;
      },
    );
    detailPromises.set(key, promise);
  }
  return withAbort(detailPromises.get(key), signal);
}

/**
 * Resolves border codes to country summaries, in the given order, using the cached list.
 * (v5 has no documented multi-code lookup, so this avoids one request per neighbour.)
 */
export async function getNeighbours(borderCodes, { signal } = {}) {
  if (!Array.isArray(borderCodes) || borderCodes.length === 0) return [];
  const countries = await getAllCountries({ signal });
  const byCode = new Map(countries.map((country) => [country.code, country]));
  return borderCodes.map((code) => byCode.get(code)).filter(Boolean);
}
