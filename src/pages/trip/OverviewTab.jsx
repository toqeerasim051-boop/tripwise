import { Link, useOutletContext } from 'react-router';
import ErrorState from '../../components/common/ErrorState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import WeatherNow from '../../components/weather/WeatherNow.jsx';
import StaleWeatherNote from '../../components/weather/StaleWeatherNote.jsx';
import ForecastList from '../../components/weather/ForecastList.jsx';
import { sectionCard } from '../../components/layout/layoutStyles.js';
import { useWeather } from '../../hooks/useWeather.js';
import { formatDate, tripLengthInDays } from '../../utils/dates.js';
import { formatTimestamp, pluralize } from '../../utils/formatters.js';
import { countActivities } from '../../utils/tripModel.js';
import { getTripForecastView } from '../../utils/tripForecast.js';

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className={sectionCard}>
      <h2 id={id} className="mb-4 text-lg font-semibold text-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

function forecastHeading(view) {
  if (view.mode === 'trip') {
    return view.coveredDays === view.tripDays
      ? 'Forecast for your trip'
      : `Forecast for ${pluralize(view.coveredDays, 'day')} of your trip`;
  }
  return 'Current 7-day forecast';
}

function forecastNote(view) {
  if (view.mode === 'trip') {
    return view.coveredDays < view.tripDays
      ? 'Forecast available up to 16 days ahead. Check back for the remaining days.'
      : null;
  }
  if (view.mode === 'past') return 'This trip has ended. Showing current conditions.';
  const until =
    view.daysUntilStart !== null
      ? ` Your trip starts in ${pluralize(view.daysUntilStart, 'day')}.`
      : '';
  return `Forecast available up to 16 days ahead.${until}`;
}

/** Destination weather: trip days inside the 16-day window, otherwise the current week. */
function TripWeather({ trip }) {
  const { data: forecast, status, error, retry } = useWeather(trip.lat, trip.lon);

  if (status === 'idle') {
    return (
      <Section id="trip-weather-heading" title="Weather">
        <p className="text-fg-muted">Weather isn&apos;t available for this destination.</p>
      </Section>
    );
  }

  const view = status === 'success' ? getTripForecastView(forecast, trip) : null;
  const note = view ? forecastNote(view) : null;

  return (
    <Section id="trip-weather-heading" title={`Weather in ${trip.destinationName}`}>
      <div aria-live="polite" aria-busy={status === 'loading'}>
        {status === 'loading' && (
          <div className="space-y-4">
            <span className="sr-only">Loading weather…</span>
            <Skeleton className="h-16 w-48" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}
        {status === 'error' && (
          <ErrorState compact title="Couldn't load the weather" error={error} onRetry={retry} />
        )}
        {view && (
          <div className="space-y-6">
            {forecast.staleSince && <StaleWeatherNote since={forecast.staleSince} />}
            {forecast.current && <WeatherNow current={forecast.current} units={forecast.units} />}
            <div>
              <h3 className="mb-1 text-sm font-semibold text-fg">{forecastHeading(view)}</h3>
              {note && <p className="mb-2 text-sm text-fg-muted">{note}</p>}
              <ForecastList days={view.days} units={forecast.units} todayDate={view.todayDate} />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

export default function OverviewTab() {
  const { trip } = useOutletContext();
  const plannedDays = trip.days.filter((day) => day.activities.length > 0).length;

  const facts = [
    [
      'Destination',
      <Link
        key="destination"
        to={`/countries/${trip.countryCode}`}
        className="font-medium text-primary hover:underline"
      >
        {trip.destinationName}
      </Link>,
    ],
    ['Dates', `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`],
    ['Length', pluralize(tripLengthInDays(trip.startDate, trip.endDate), 'day')],
    [
      'Itinerary',
      `${pluralize(countActivities(trip), 'activity', 'activities')} across ${pluralize(plannedDays, 'day')}`,
    ],
    ['Budget currency', trip.currency],
    ['Created', formatTimestamp(trip.createdAt)],
    ['Last edited', formatTimestamp(trip.updatedAt)],
  ];

  return (
    <div className="grid gap-6">
      <Section id="trip-overview-heading" title="Trip summary">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {facts.map(([term, value]) => (
            <div key={term}>
              <dt className="text-sm text-fg-muted">{term}</dt>
              <dd className="font-medium text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <TripWeather trip={trip} />
    </div>
  );
}
