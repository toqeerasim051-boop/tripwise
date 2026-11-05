// @vitest-environment node
import {
  clearForecastCache,
  getForecast,
  isValidCoordinate,
  normalizeForecast,
} from './openMeteo.js';
import { jsonResponse, mockFetch } from '../test/fetchMocks.js';
import { useFakeLocalStorage } from '../test/fakeLocalStorage.js';

// Trimmed copy of a real response (Paris, 2026-10-27), including trailing nulls.
const apiResponse = {
  timezone: 'Europe/Paris',
  current_units: { temperature_2m: '°C', wind_speed_10m: 'km/h' },
  current: {
    time: '2026-10-27T13:15',
    temperature_2m: 15.6,
    weather_code: 3,
    wind_speed_10m: 10.8,
  },
  daily_units: { temperature_2m_max: '°C' },
  daily: {
    time: ['2026-10-27', '2026-10-28'],
    temperature_2m_max: [17.6, 15.3],
    temperature_2m_min: [11.1, 8.3],
    weather_code: [80, 2],
    precipitation_probability_max: [73, null],
  },
};

beforeEach(() => clearForecastCache());

describe('normalizeForecast', () => {
  it('maps current conditions and zips daily arrays', () => {
    expect(normalizeForecast(apiResponse)).toEqual({
      timezone: 'Europe/Paris',
      units: { temperature: '°C', windSpeed: 'km/h' },
      current: { time: '2026-10-27T13:15', temperature: 15.6, weatherCode: 3, windSpeed: 10.8 },
      daily: [
        { date: '2026-10-27', max: 17.6, min: 11.1, weatherCode: 80, precipitationProbability: 73 },
        { date: '2026-10-28', max: 15.3, min: 8.3, weatherCode: 2, precipitationProbability: null },
      ],
    });
  });

  it('tolerates missing current block and missing daily series', () => {
    const result = normalizeForecast({ daily: { time: ['2026-01-01'] } });
    expect(result.current).toBeNull();
    expect(result.daily[0]).toEqual({
      date: '2026-01-01',
      max: null,
      min: null,
      weatherCode: null,
      precipitationProbability: null,
    });
  });

  it('throws for error bodies and unexpected shapes', () => {
    expect(() => normalizeForecast({ error: true, reason: 'Bad' })).toThrow('Bad');
    expect(() => normalizeForecast({})).toThrow(/Unexpected/);
  });
});

describe('isValidCoordinate', () => {
  it.each([
    [48.86, 2.35, true],
    [-90, 180, true],
    [91, 0, false],
    [0, -181, false],
    [null, 0, false],
    [Number.NaN, 0, false],
  ])('(%s, %s) -> %s', (lat, lon, expected) => {
    expect(isValidCoordinate(lat, lon)).toBe(expected);
  });
});

describe('getForecast', () => {
  it('requests 16 days with rounded coordinates and local timezone', async () => {
    const fetchMock = mockFetch(async () => jsonResponse(apiResponse));

    const forecast = await getForecast({ lat: 48.85661, lon: 2.35222 });

    expect(forecast.daily).toHaveLength(2);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      latitude: '48.86',
      longitude: '2.35',
      timezone: 'auto',
      forecast_days: '16',
      current: 'temperature_2m,weather_code,wind_speed_10m',
    });
  });

  it('caches by rounded location for 30 minutes', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
      const fetchMock = mockFetch(async () => jsonResponse(apiResponse));

      await getForecast({ lat: 48.856, lon: 2.352 });
      await getForecast({ lat: 48.859, lon: 2.349 }); // same rounded key
      expect(fetchMock).toHaveBeenCalledTimes(1);

      vi.setSystemTime(new Date('2026-10-27T12:31:00Z'));
      await getForecast({ lat: 48.856, lon: 2.352 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not cache failures', async () => {
    const fetchMock = mockFetch()
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }))
      .mockResolvedValueOnce(jsonResponse(apiResponse));

    await expect(getForecast({ lat: 1, lon: 1 })).rejects.toMatchObject({ status: 503 });
    await expect(getForecast({ lat: 1, lon: 1 })).resolves.toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid coordinates without a request', async () => {
    const fetchMock = mockFetch(async () => jsonResponse(apiResponse));
    await expect(getForecast({ lat: null, lon: 2 })).rejects.toBeInstanceOf(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getForecast browser cache', () => {
  const browser = useFakeLocalStorage();
  const newVisit = () => {
    const saved = { ...browser.storage };
    clearForecastCache();
    Object.assign(browser.storage, saved);
  };
  afterEach(() => vi.useRealTimers());

  it('reuses a forecast from an earlier visit until its 30 minutes run out', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
    const fetchMock = mockFetch(async () => jsonResponse(apiResponse));
    const paris = { lat: 48.8566, lon: 2.3522 };

    await getForecast(paris);
    vi.setSystemTime(new Date('2026-10-27T12:20:00Z'));
    newVisit();
    expect((await getForecast(paris)).daily).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-10-27T12:31:00Z'));
    newVisit();
    await getForecast(paris);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('getForecast offline fallback', () => {
  const browser = useFakeLocalStorage();
  const newVisit = () => {
    const saved = { ...browser.storage };
    clearForecastCache();
    Object.assign(browser.storage, saved);
  };
  afterEach(() => vi.useRealTimers());

  it('returns the last saved forecast with its age when the request fails temporarily', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));
    mockFetch()
      .mockResolvedValueOnce(jsonResponse(apiResponse))
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }))
      .mockResolvedValueOnce(jsonResponse(apiResponse));
    const paris = { lat: 48.8566, lon: 2.3522 };
    await getForecast(paris);

    vi.setSystemTime(new Date('2026-10-27T15:00:00Z'));
    newVisit();
    const stale = await getForecast(paris);
    expect(stale.daily).toHaveLength(2);
    expect(stale.staleSince).toBe(Date.parse('2026-10-27T12:00:00Z'));

    // The stale copy isn't kept in memory: the next call tries the network again.
    expect((await getForecast(paris)).staleSince).toBeUndefined();
  });

  it('still fails without a saved copy or for non-temporary errors', async () => {
    mockFetch()
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }))
      .mockResolvedValueOnce(jsonResponse(apiResponse))
      .mockResolvedValueOnce(jsonResponse({}, { status: 400 }));
    await expect(getForecast({ lat: 1, lon: 1 })).rejects.toMatchObject({ status: 503 });

    await getForecast({ lat: 2, lon: 2 });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 31 * 60_000);
    newVisit();
    await expect(getForecast({ lat: 2, lon: 2 })).rejects.toMatchObject({ status: 400 });
  });
});
