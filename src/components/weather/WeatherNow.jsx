import WeatherIcon from './WeatherIcon.jsx';
import { getWeatherInfo } from '../../utils/weatherCodes.js';
import { formatNumber, formatTemperature } from '../../utils/formatters.js';

/** Current conditions. The icon is decorative; the label carries the meaning. */
export default function WeatherNow({ current, units }) {
  const info = getWeatherInfo(current.weatherCode);

  return (
    <div className="flex items-center gap-4">
      <WeatherIcon name={info.icon} className="size-16" />
      <div>
        <p className="text-3xl font-bold text-fg">
          {formatTemperature(current.temperature, units.temperature)}
        </p>
        <p className="font-medium text-fg">{info.label}</p>
        {current.windSpeed !== null && (
          <p className="text-sm text-fg-muted">
            Wind {formatNumber(current.windSpeed)} {units.windSpeed}
          </p>
        )}
      </div>
    </div>
  );
}
