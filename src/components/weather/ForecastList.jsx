import { DropletIcon } from '../common/Icons.jsx';
import WeatherIcon from './WeatherIcon.jsx';
import { getWeatherInfo } from '../../utils/weatherCodes.js';
import { formatPercent, formatTemperature } from '../../utils/formatters.js';
import { formatDate } from '../../utils/dates.js';

/**
 * Daily forecast cards. Dates are local to the destination; `todayDate` is the destination's
 * today (the forecast's first date) and is labelled "Today". Each card reads naturally to screen
 * readers: "Today: Rain, high 18°C, low 11°C, 73% chance of rain".
 */
export default function ForecastList({ days, units, todayDate = days[0]?.date }) {
  // Columns follow the list's own width (container query), not the screen: the country page
  // shows it in a narrow side column, the trip overview across the full page.
  return (
    <div className="@container">
      <ol
        role="list"
        className="grid grid-cols-2 gap-2 @min-[22rem]:grid-cols-3 @min-[30rem]:grid-cols-4 @min-[44rem]:grid-cols-7"
      >
        {days.map((day) => {
          const info = getWeatherInfo(day.weatherCode);
          const dayName =
            day.date === todayDate
              ? 'Today'
              : formatDate(day.date, { weekday: 'short', day: 'numeric', month: 'short' });
          const fullDate = formatDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' });
          const high = formatTemperature(day.max, units.temperature);
          const low = formatTemperature(day.min, units.temperature);

          return (
            <li
              key={day.date}
              className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface p-3 text-center"
            >
              <p className="text-sm font-semibold text-fg">
                <time dateTime={day.date} title={fullDate}>
                  {dayName}
                </time>
                <span className="sr-only">: </span>
              </p>
              <WeatherIcon name={info.icon} className="size-9" />
              <p className="text-xs text-fg-muted">
                {info.label}
                <span className="sr-only">,</span>
              </p>
              <p className="text-sm text-fg">
                <span className="sr-only">high </span>
                <span className="font-semibold">{high}</span>
                <span aria-hidden="true"> / </span>
                <span className="sr-only">, low </span>
                <span className="text-fg-muted">{low}</span>
              </p>
              {day.precipitationProbability !== null && (
                <p className="text-xs text-fg-muted">
                  <DropletIcon className="mr-1 inline size-3 align-[-1px] text-primary" />
                  {formatPercent(day.precipitationProbability)}
                  <span className="sr-only"> chance of rain</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
