// @vitest-environment node
import {
  clearCountriesCache,
  getAllCountries,
  getCountry,
  getNeighbours,
  normalizeCountryDetail,
  normalizeCountrySummary,
} from './restCountries.js';
import { isAbortError } from './http.js';
import { jsonResponse, mockFetch } from '../test/fetchMocks.js';
import { useFakeLocalStorage } from '../test/fakeLocalStorage.js';

function rawCountry(overrides = {}) {
  return {
    names: { common: 'France', official: 'French Republic' },
    codes: { alpha_3: 'FRA' },
    flag: {
      url_svg: 'https://flags.example/fr.svg',
      url_png: 'https://flags.example/fr.png',
      description: 'Blue, white and red',
    },
    region: 'Europe',
    subregion: 'Western Europe',
    population: 68_000_000,
    capitals: [
      { name: 'Paris', coordinates: { lat: 48.86, lng: 2.35 }, attributes: { primary: true } },
    ],
    coordinates: { lat: 46, lng: 2 },
    currencies: { EUR: { name: 'Euro', symbol: '€' } },
    area: { kilometers: 551_695 },
    ...overrides,
  };
}

const page = (objects, meta = {}) =>
  jsonResponse({ data: { objects, meta: { total: objects.length, more: false, ...meta } } });

beforeEach(() => {
  clearCountriesCache();
  vi.stubEnv('VITE_RESTCOUNTRIES_API_KEY', 'test-key');
});

describe('normalizeCountrySummary', () => {
  it('flattens the v5 shape and prefers capital coordinates', () => {
    expect(normalizeCountrySummary(rawCountry())).toEqual({
      code: 'FRA',
      name: 'France',
      officialName: 'French Republic',
      flagUrl: 'https://flags.example/fr.svg',
      flagAlt: 'Blue, white and red',
      region: 'Europe',
      subregion: 'Western Europe',
      population: 68_000_000,
      areaKm2: 551_695,
      capital: 'Paris',
      lat: 48.86,
      lon: 2.35,
      coordsSource: 'capital',
      currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
    });
  });

  it('falls back to country coordinates, then to no coordinates', () => {
    const noCapitalCoords = normalizeCountrySummary(rawCountry({ capitals: [{ name: 'Paris' }] }));
    expect(noCapitalCoords).toMatchObject({ lat: 46, lon: 2, coordsSource: 'country' });

    const none = normalizeCountrySummary(rawCountry({ capitals: [], coordinates: undefined }));
    expect(none).toMatchObject({ capital: null, lat: null, lon: null, coordsSource: null });
  });

  it('accepts alternative coordinate and currency shapes', () => {
    const country = normalizeCountrySummary(
      rawCountry({
        capitals: [{ name: 'Paris', coordinates: [48.8, 2.3] }],
        currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }, { code: 'bad' }],
      }),
    );
    expect(country).toMatchObject({ lat: 48.8, lon: 2.3 });
    expect(country.currencies).toEqual([{ code: 'EUR', name: 'Euro', symbol: '€' }]);
  });

  it('picks the primary capital when there are several', () => {
    const country = normalizeCountrySummary(
      rawCountry({
        capitals: [
          { name: 'Bloemfontein', attributes: { primary: false } },
          { name: 'Pretoria', attributes: ['primary'] },
        ],
      }),
    );
    expect(country.capital).toBe('Pretoria');
  });

  it('rejects out-of-range coordinates and uses defaults for missing optional fields', () => {
    const country = normalizeCountrySummary(
      rawCountry({
        capitals: [{ name: 'X', coordinates: { lat: 200, lng: 0 } }],
        coordinates: null,
        flag: {},
        region: '',
        population: 'lots',
      }),
    );
    expect(country).toMatchObject({
      lat: null,
      flagUrl: null,
      flagAlt: 'Flag of France',
      region: 'Other',
      population: null,
    });
  });

  it.each([[null], [{}], [rawCountry({ codes: { alpha_3: 'FR' } })], [rawCountry({ names: {} })]])(
    'returns null for invalid entries',
    (raw) => {
      expect(normalizeCountrySummary(raw)).toBeNull();
    },
  );
});

describe('normalizeCountryDetail', () => {
  it('adds languages, timezones, borders and area', () => {
    const detail = normalizeCountryDetail(
      rawCountry({
        languages: [{ name_english: 'French' }, 'Breton', { name: 'Occitan' }, { iso: 'x' }],
        timezones: ['UTC+01:00', 5],
        borders: ['bel', 'DEU', 'XX'],
        area: { kilometers: 551_695 },
      }),
    );
    expect(detail).toMatchObject({
      languages: ['French', 'Breton', 'Occitan'],
      timezones: ['UTC+01:00'],
      borders: ['BEL', 'DEU'],
      areaKm2: 551_695,
    });
  });

  it('accepts a v3-style languages object', () => {
    expect(normalizeCountryDetail(rawCountry({ languages: { fra: 'French' } })).languages).toEqual([
      'French',
    ]);
  });
});

describe('getAllCountries', () => {
  it('pages through results with the API key, normalises, dedupes and sorts', async () => {
    const fetchMock = mockFetch()
      .mockResolvedValueOnce(
        page(
          [rawCountry({ names: { common: 'Germany' }, codes: { alpha_3: 'DEU' } }), rawCountry()],
          {
            total: 3,
            more: true,
          },
        ),
      )
      .mockResolvedValueOnce(
        page([
          rawCountry({ names: { common: 'Austria' }, codes: { alpha_3: 'AUT' } }),
          rawCountry(),
          {},
        ]),
      );
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const countries = await getAllCountries();

    expect(countries.map((c) => c.code)).toEqual(['AUT', 'FRA', 'DEU']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl, init] = fetchMock.mock.calls[0];
    const url = new URL(firstUrl);
    expect(url.origin + url.pathname).toBe('https://api.restcountries.com/countries/v5');
    expect(url.searchParams.get('limit')).toBe('100');
    expect(url.searchParams.get('offset')).toBe('0');
    expect(url.searchParams.get('response_fields')).toContain('codes.alpha_3');
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('offset')).toBe('2');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('skipped 2'));
  });

  it('uses meta.total when meta.more is absent', async () => {
    const fetchMock = mockFetch()
      .mockResolvedValueOnce(
        jsonResponse({ data: { objects: [rawCountry()], meta: { total: 2 } } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { objects: [rawCountry({ codes: { alpha_3: 'DEU' } })], meta: { total: 2 } },
        }),
      );
    await getAllCountries();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('caches the list for the session', async () => {
    const fetchMock = mockFetch(async () => page([rawCountry()]));
    await getAllCountries();
    await getAllCountries();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures, so retry works', async () => {
    const fetchMock = mockFetch()
      .mockResolvedValueOnce(jsonResponse({}, { status: 500 }))
      .mockResolvedValueOnce(page([rawCountry()]));

    await expect(getAllCountries()).rejects.toMatchObject({ status: 500 });
    await expect(getAllCountries()).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects 200 responses that carry an errors array (deprecated API style)', async () => {
    mockFetch(async () =>
      jsonResponse({
        success: false,
        data: null,
        errors: [{ message: 'This API version has been deprecated.' }],
      }),
    );
    await expect(getAllCountries()).rejects.toMatchObject({ kind: 'api', message: /deprecated/ });
  });

  it('rejects unexpected shapes', async () => {
    mockFetch(async () => jsonResponse({ data: {} }));
    await expect(getAllCountries()).rejects.toMatchObject({ kind: 'parse' });
  });

  it('fails with a config error and no request when the key is missing', async () => {
    vi.stubEnv('VITE_RESTCOUNTRIES_API_KEY', '');
    const fetchMock = mockFetch(async () => page([]));
    await expect(getAllCountries()).rejects.toMatchObject({ kind: 'config' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets one caller abort without cancelling the shared request', async () => {
    let respond;
    mockFetch(
      () =>
        new Promise((resolve) => {
          respond = () => resolve(page([rawCountry()]));
        }),
    );
    const controller = new AbortController();
    const first = getAllCountries({ signal: controller.signal }).catch((e) => e);
    const second = getAllCountries();

    controller.abort();
    respond();

    expect(isAbortError(await first)).toBe(true);
    await expect(second).resolves.toHaveLength(1);
  });
});

describe('getCountry', () => {
  it('fetches one country by alpha-3 code and caches it', async () => {
    const fetchMock = mockFetch(async () => page([rawCountry({ borders: ['BEL'] })]));

    const country = await getCountry('fra');
    await getCountry('FRA');

    expect(country).toMatchObject({ code: 'FRA', borders: ['BEL'] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/countries/v5/codes.alpha_3/FRA');
    expect(url.searchParams.get('response_fields')).toContain('borders');
  });

  it('rejects with 404 when no country matches', async () => {
    mockFetch(async () => page([]));
    await expect(getCountry('ZZZ')).rejects.toMatchObject({ kind: 'http', status: 404 });
  });

  it('rejects invalid codes without a request', async () => {
    const fetchMock = mockFetch(async () => page([]));
    await expect(getCountry('../x')).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getNeighbours', () => {
  it('resolves border codes from the cached list, in order, skipping unknown codes', async () => {
    mockFetch(async () =>
      page([
        rawCountry(),
        rawCountry({ names: { common: 'Belgium' }, codes: { alpha_3: 'BEL' } }),
        rawCountry({ names: { common: 'Spain' }, codes: { alpha_3: 'ESP' } }),
      ]),
    );
    const neighbours = await getNeighbours(['ESP', 'XXX', 'BEL']);
    expect(neighbours.map((c) => c.name)).toEqual(['Spain', 'Belgium']);
  });

  it('returns [] without a request for no borders', async () => {
    const fetchMock = mockFetch(async () => page([]));
    await expect(getNeighbours([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('browser cache', () => {
  const browser = useFakeLocalStorage();
  // A new visit forgets the in-memory cache but keeps localStorage.
  const newVisit = () => {
    const saved = { ...browser.storage };
    clearCountriesCache();
    Object.assign(browser.storage, saved);
  };
  afterEach(() => vi.useRealTimers());

  it('keeps the country list for a day between visits', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
    const fetchMock = mockFetch(async () => page([rawCountry()]));

    await getAllCountries();
    newVisit();
    expect((await getAllCountries()).map((country) => country.code)).toEqual(['FRA']);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-10-28T12:00:01Z'));
    newVisit();
    await getAllCountries();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps country details between visits, but not failures', async () => {
    const fetchMock = mockFetch()
      .mockResolvedValueOnce(jsonResponse({ message: 'down' }, { status: 500 }))
      .mockResolvedValue(page([rawCountry()]));

    await expect(getCountry('FRA')).rejects.toThrow();
    expect((await getCountry('FRA')).name).toBe('France');
    newVisit();
    expect((await getCountry('fra')).name).toBe('France');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clearCountriesCache also clears the browser cache', async () => {
    const fetchMock = mockFetch(async () => page([rawCountry()]));
    await getAllCountries();
    clearCountriesCache();
    await getAllCountries();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to the last saved list when the service is unreachable', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
    mockFetch()
      .mockResolvedValueOnce(page([rawCountry()]))
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }));
    await getAllCountries();

    vi.setSystemTime(new Date('2026-10-30T12:00:00Z')); // expired, but kept as a fallback
    newVisit();
    expect((await getAllCountries()).map((country) => country.code)).toEqual(['FRA']);
  });
});
