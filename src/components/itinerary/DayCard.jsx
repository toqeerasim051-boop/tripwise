import ActivityItem from './ActivityItem.jsx';
import DayNotes from './DayNotes.jsx';
import { AlertIcon, CalendarIcon, PlusIcon } from '../common/Icons.jsx';
import WeatherIcon from '../weather/WeatherIcon.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { formatPercent, formatTemperature, pluralize } from '../../utils/formatters.js';
import { getWeatherInfo } from '../../utils/weatherCodes.js';

/** "(icon) Rain · 14°C / 8°C · 80% chance of rain" for days inside the forecast window. */
function DayWeather({ forecast, unit }) {
  const info = getWeatherInfo(forecast.weatherCode);
  return (
    <p className="mt-1 text-sm text-fg-muted">
      <WeatherIcon name={info.icon} className="mr-1.5 inline size-5 align-[-5px]" />
      {info.label} · {formatTemperature(forecast.max, unit)} /{' '}
      {formatTemperature(forecast.min, unit)}
      {forecast.precipitationProbability !== null &&
        ` · ${formatPercent(forecast.precipitationProbability)} chance of rain`}
    </p>
  );
}

/** Outdoor plans on a wet day, with a one-click move to the suggested dry day. */
function WeatherWarning({ warning, label, onMove }) {
  const count = pluralize(warning.activities.length, 'outdoor plan');
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning bg-surface p-3 text-sm">
      <AlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="grid gap-2">
        <p className="font-medium text-fg">
          Bad weather is forecast for {label}. You have {count} that day.
        </p>
        {warning.dryDayLabel ? (
          <button
            type="button"
            data-control="move-outdoor"
            className={`${buttonStyles.secondary} ${buttonStyles.small} justify-self-start`}
            onClick={onMove}
          >
            Move outdoor plans to {warning.dryDayLabel}
          </button>
        ) : (
          <p className="text-fg-muted">No dry day is forecast yet. Keep an indoor backup.</p>
        )}
      </div>
    </div>
  );
}

/**
 * One itinerary day: heading, notes, ordered activities and day-level actions.
 * `handlers` receive the activity (and its index) so this stays presentational. `weather` is
 * { forecast, unit } for days inside the forecast window; `warning` comes from getWeatherWarnings
 * (plus `dryDayLabel`).
 */
export default function DayCard({ day, label, dateLabel, isOnlyDay, handlers, weather, warning }) {
  const headingId = `day-${day.id}-heading`;
  const { activities } = day;
  const canSortByTime = activities.length > 1 && activities.some((activity) => activity.time);

  return (
    <section
      aria-labelledby={headingId}
      data-day-id={day.id}
      className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="flex items-center gap-3 text-fg">
          <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary">
            <CalendarIcon className="size-4" />
          </span>
          <span>
            <span className="font-display text-lg font-bold">{label}</span>{' '}
            <span className="text-sm text-fg-muted">· {dateLabel}</span>
          </span>
        </h3>
        <span className="text-sm text-fg-muted">
          {pluralize(activities.length, 'activity', 'activities')}
        </span>
      </div>
      {weather && <DayWeather forecast={weather.forecast} unit={weather.unit} />}
      {warning && (
        <WeatherWarning
          warning={warning}
          label={label}
          onMove={() => handlers.onMoveOutdoor(day, warning)}
        />
      )}

      <DayNotes
        dayId={day.id}
        dayLabel={label}
        notes={day.notes}
        onSave={(notes) => handlers.onSaveNotes(day, notes)}
      />

      {activities.length === 0 ? (
        <p className="mt-3 text-sm text-fg-muted">No activities planned yet.</p>
      ) : (
        <ol role="list" className="mt-3 grid gap-2">
          {activities.map((activity, index) => (
            <li key={activity.id}>
              <ActivityItem
                activity={activity}
                isFirst={index === 0}
                isLast={index === activities.length - 1}
                canMoveToOtherDay={!isOnlyDay}
                onMoveUp={() => handlers.onMove(day, activity, index - 1)}
                onMoveDown={() => handlers.onMove(day, activity, index + 1)}
                onMoveToDay={() => handlers.onMoveToDay(day, activity)}
                onEdit={() => handlers.onEdit(day, activity)}
                onDelete={() => handlers.onDelete(day, activity, index)}
              />
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-control="add"
          className={`${buttonStyles.primary} ${buttonStyles.small}`}
          onClick={() => handlers.onAdd(day)}
        >
          <PlusIcon className="size-4" />
          Add activity <span className="sr-only">to {label}</span>
        </button>
        {canSortByTime && (
          <button
            type="button"
            className={`${buttonStyles.secondary} ${buttonStyles.small}`}
            onClick={() => handlers.onSortByTime(day)}
          >
            Sort by time <span className="sr-only">for {label}</span>
          </button>
        )}
      </div>
    </section>
  );
}
