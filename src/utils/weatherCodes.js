/** WMO weather interpretation codes used by Open-Meteo. Single source of truth for labels/icons. */
const WEATHER_CODES = {
  0: { label: 'Clear sky', icon: 'clear' },
  1: { label: 'Mainly clear', icon: 'partly-cloudy' },
  2: { label: 'Partly cloudy', icon: 'partly-cloudy' },
  3: { label: 'Overcast', icon: 'cloudy' },
  45: { label: 'Fog', icon: 'fog' },
  48: { label: 'Freezing fog', icon: 'fog' },
  51: { label: 'Light drizzle', icon: 'drizzle' },
  53: { label: 'Drizzle', icon: 'drizzle' },
  55: { label: 'Heavy drizzle', icon: 'drizzle' },
  56: { label: 'Light freezing drizzle', icon: 'freezing-rain' },
  57: { label: 'Freezing drizzle', icon: 'freezing-rain' },
  61: { label: 'Light rain', icon: 'rain' },
  63: { label: 'Rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain' },
  66: { label: 'Light freezing rain', icon: 'freezing-rain' },
  67: { label: 'Freezing rain', icon: 'freezing-rain' },
  71: { label: 'Light snow', icon: 'snow' },
  73: { label: 'Snow', icon: 'snow' },
  75: { label: 'Heavy snow', icon: 'snow' },
  77: { label: 'Snow grains', icon: 'snow' },
  80: { label: 'Light showers', icon: 'rain' },
  81: { label: 'Showers', icon: 'rain' },
  82: { label: 'Heavy showers', icon: 'rain' },
  85: { label: 'Light snow showers', icon: 'snow' },
  86: { label: 'Snow showers', icon: 'snow' },
  95: { label: 'Thunderstorm', icon: 'thunderstorm' },
  96: { label: 'Thunderstorm with hail', icon: 'thunderstorm' },
  99: { label: 'Severe thunderstorm with hail', icon: 'thunderstorm' },
};

const UNKNOWN = { label: 'Unknown conditions', icon: 'unknown' };

/** `icon` picks the decorative WeatherIcon; the visible `label` carries the meaning. */
export function getWeatherInfo(code) {
  return WEATHER_CODES[code] ?? UNKNOWN;
}
