import { useAsyncResource } from './useAsyncResource.js';
import { getForecast, isValidCoordinate } from '../services/openMeteo.js';

const loadForecast = (key, signal) => {
  const [lat, lon] = key.split(',').map(Number);
  return getForecast({ lat, lon }, { signal });
};

/** Forecast for a location; idle when coordinates are missing or invalid. */
export function useWeather(lat, lon) {
  return useAsyncResource(isValidCoordinate(lat, lon) ? `${lat},${lon}` : null, loadForecast);
}
