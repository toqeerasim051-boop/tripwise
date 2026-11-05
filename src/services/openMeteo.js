import { ApiError, getJson, isTemporaryError, withAbort } from './http.js';
import { clearCached, loadCached, saveCached } from '../utils/storage.js';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
export const FORECAST_DAYS = 16; // API maximum
const CACHE_TTL_MS = 30 * 60 * 1000;

const cache = new Map(); // "lat,lon" -> { expiresAt, promise }

/** Test helper: forget all cached forecasts. */
export function clearForecastCache() {
  cache.clear();
  clearCached('weather:');
}

function toFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const isForecast = (data) => Array.isArray(data?.daily) && typeof data.units === 'object';

export function isValidCoordinate(lat, lon) {
  return (
    toFiniteNumber(lat) !== null &&
    toFiniteNumber(lon) !== null &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

export function normalizeForecast(body) {
  if (body?.error) {
    throw new ApiError(body.reason ?? 'Open-Meteo returned an error', { kind: 'api' });
  }
  const daily = body?.daily;
  if (!daily || !Array.isArray(daily.time)) {
    throw new ApiError('Unexpected Open-Meteo response shape', { kind: 'parse' });
  }

  // Values can be null (e.g. precipitation probability at the end of the range).
  const dailyValue = (key, index) => toFiniteNumber(daily[key]?.[index]);
  const current = body.current;

  return {
    timezone: typeof body.timezone === 'string' ? body.timezone : null,
    units: {
      temperature: body.daily_units?.temperature_2m_max ?? '°C',
      windSpeed: body.current_units?.wind_speed_10m ?? 'km/h',
    },
    current: current
      ? {
          time: typeof current.time === 'string' ? current.time : null,
          temperature: toFiniteNumber(current.temperature_2m),
          weatherCode: toFiniteNumber(current.weather_code),
          windSpeed: toFiniteNumber(current.wind_speed_10m),
        }
      : null,
    daily: daily.time.map((date, index) => ({
      date,
      max: dailyValue('temperature_2m_max', index),
      min: dailyValue('temperature_2m_min', index),
      weatherCode: dailyValue('weather_code', index),
      precipitationProbability: dailyValue('precipitation_probability_max', index),
    })),
  };
}

async function fetchForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
  });
  return normalizeForecast(await getJson(`${BASE_URL}?${params}`));
}

/**
 * Current conditions + 16-day daily forecast, cached for 30 min per location (coordinates
 * rounded to 2 decimals, ~1 km). Days are local to the destination. When the request fails for a
 * temporary reason, an older saved forecast is returned with `staleSince` (ms timestamp of when
 * it was fetched) so the UI can say how old it is.
 */
export function getForecast({ lat, lon }, { signal } = {}) {
  if (!isValidCoordinate(lat, lon)) {
    return Promise.reject(new RangeError(`Invalid coordinates: ${lat}, ${lon}`));
  }

  const roundedLat = Number(lat.toFixed(2));
  const roundedLon = Number(lon.toFixed(2));
  const key = `${roundedLat},${roundedLon}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return withAbort(cached.promise, signal);

  // A forecast saved by an earlier visit is reused until its own 30 minutes run out.
  const stored = loadCached(`weather:${key}`, isForecast, now);
  if (stored) {
    cache.set(key, { expiresAt: stored.expiresAt, promise: Promise.resolve(stored.data) });
    return withAbort(cache.get(key).promise, signal);
  }

  const promise = fetchForecast(roundedLat, roundedLon)
    .then((forecast) => {
      saveCached(`weather:${key}`, forecast, CACHE_TTL_MS, now);
      return forecast;
    })
    .catch((error) => {
      if (cache.get(key)?.promise === promise) cache.delete(key);
      // Offline or the service is down: an older forecast (labelled by the UI) beats an error.
      const stale =
        isTemporaryError(error) &&
        loadCached(`weather:${key}`, isForecast, Date.now(), { allowStale: true });
      if (!stale) throw error;
      return { ...stale.data, staleSince: stale.expiresAt - CACHE_TTL_MS };
    });
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, promise });
  return withAbort(promise, signal);
}
