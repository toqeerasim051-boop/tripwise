import { useState } from 'react';
import { Link, useParams } from 'react-router';
import ErrorState from '../components/common/ErrorState.jsx';
import Reveal from '../components/common/Reveal.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import WishlistButton from '../components/common/WishlistButton.jsx';
import { buttonStyles } from '../components/common/buttonStyles.js';
import { pageContainer } from '../components/layout/layoutStyles.js';
import CountryHero from '../components/countries/CountryHero.jsx';
import NeighbourList from '../components/countries/NeighbourList.jsx';
import AttractionCard from '../components/attractions/AttractionCard.jsx';
import AddToTripDialog from '../components/attractions/AddToTripDialog.jsx';
import AttractionMapLoader from '../components/attractions/AttractionMapLoader.jsx';
import WeatherNow from '../components/weather/WeatherNow.jsx';
import StaleWeatherNote from '../components/weather/StaleWeatherNote.jsx';
import ForecastList from '../components/weather/ForecastList.jsx';
import { useCountry, useNeighbours } from '../hooks/useCountries.js';
import { useAttractions } from '../hooks/useAttractions.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useTrips } from '../hooks/useTrips.js';
import { useWeather } from '../hooks/useWeather.js';
import { attractionToActivityValues } from '../utils/attractions.js';
import { formatList, formatNumber } from '../utils/formatters.js';
import { dayLabel } from '../utils/itinerary.js';
import { sortTripsByUpdated } from '../utils/tripModel.js';

const COUNTRY_PAGE_FORECAST_DAYS = 7;

function Section({ id, title, description, children, className = '' }) {
  const headingId = `section-${id}`;
  return (
    <Reveal
      as="section"
      id={id}
      aria-labelledby={headingId}
      className={`scroll-mt-24 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6 ${className}`}
    >
      <div className="mb-5">
        <h2 id={headingId} className="text-xl font-bold tracking-tight text-fg">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {children}
    </Reveal>
  );
}

function Facts({ country }) {
  const facts = [
    ['Capital', country.capital ?? 'None'],
    ['Region', [country.region, country.subregion].filter(Boolean).join(' · ')],
    ['Population', formatNumber(country.population)],
    ['Area', country.areaKm2 === null ? '—' : `${formatNumber(country.areaKm2)} km²`],
    ['Languages', formatList(country.languages)],
    [
      'Currencies',
      formatList(
        country.currencies.map(({ code, name, symbol }) =>
          symbol ? `${name} (${code}, ${symbol})` : `${name} (${code})`,
        ),
      ),
    ],
    ['Time zones', country.timezones.length ? country.timezones.join(', ') : '—'],
    ['Country code', country.code],
  ];

  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {facts.map(([term, value]) => (
        <div key={term} className="rounded-xl bg-surface-muted/60 px-4 py-3">
          <dt className="text-xs font-medium tracking-wide text-fg-muted uppercase">{term}</dt>
          <dd className="mt-0.5 font-semibold wrap-break-word text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function WeatherSection({ country }) {
  const { data: forecast, status, error, retry } = useWeather(country.lat, country.lon);
  if (country.coordsSource === null) return null;

  const place = country.coordsSource === 'capital' ? country.capital : country.name;

  return (
    <Section
      id="weather"
      title={`Weather in ${place}`}
      description={
        country.coordsSource === 'country'
          ? "Based on the country's geographic centre."
          : 'Current conditions and the week ahead.'
      }
    >
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
        {status === 'success' && (
          <div className="space-y-6">
            {forecast.staleSince && <StaleWeatherNote since={forecast.staleSince} />}
            {forecast.current && <WeatherNow current={forecast.current} units={forecast.units} />}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-fg">
                {COUNTRY_PAGE_FORECAST_DAYS}-day forecast
              </h3>
              <ForecastList
                days={forecast.daily.slice(0, COUNTRY_PAGE_FORECAST_DAYS)}
                units={forecast.units}
              />
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

function AttractionsSection({ country }) {
  const { data: attractions, status, error, retry } = useAttractions(country.code);
  const trips = useTrips();
  const [adding, setAdding] = useState(null);
  const [added, setAdded] = useState(null); // { text, tripId }
  const tripsHere = sortTripsByUpdated(
    trips.trips.filter((trip) => trip.countryCode === country.code),
  );

  function addToTrip(trip, day, dayIndex) {
    trips.addActivity(trip.id, day.id, attractionToActivityValues(adding));
    setAdded({
      text: `Added “${adding.name}” to ${dayLabel(dayIndex)} of “${trip.title}”.`,
      tripId: trip.id,
    });
    setAdding(null);
  }

  return (
    <Section id="attractions" title={`Top attractions in ${country.name}`}>
      <div aria-live="polite">
        {added && (
          <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-primary-soft px-4 py-3 text-sm text-fg">
            {added.text}
            <Link
              to={`/trips/${added.tripId}/itinerary`}
              className="font-semibold underline underline-offset-2"
            >
              View itinerary
            </Link>
          </p>
        )}
      </div>

      {status === 'loading' && (
        <div aria-busy="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Loading attractions…</span>
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="aspect-4/3 w-full rounded-2xl" />
          ))}
        </div>
      )}
      {status === 'error' && (
        <ErrorState compact title="Couldn't load attractions" error={error} onRetry={retry} />
      )}
      {status === 'success' &&
        (attractions.length > 0 ? (
          <>
            <ul role="list" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {attractions.map((attraction) => (
                <li key={attraction.id}>
                  <AttractionCard attraction={attraction} onAdd={setAdding} />
                </li>
              ))}
            </ul>
            <AttractionMapLoader
              attractions={attractions}
              countryName={country.name}
              onAdd={setAdding}
            />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center">
            <p className="font-semibold text-fg">
              We haven&apos;t picked top attractions for {country.name} yet.
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              You can still plan a trip here and add your own activities.
            </p>
          </div>
        ))}

      <AddToTripDialog
        attraction={adding}
        trips={tripsHere}
        country={country}
        onAdd={addToTrip}
        onClose={() => setAdding(null)}
      />
    </Section>
  );
}

function NeighboursSection({ country }) {
  const { data: neighbours, status, error, retry } = useNeighbours(country.borders);

  return (
    <Section id="neighbours" title="Neighbouring countries">
      {status === 'loading' && (
        <div aria-busy="true" className="flex flex-wrap gap-2">
          <span className="sr-only">Loading neighbouring countries…</span>
          {country.borders.map((code) => (
            <Skeleton key={code} className="h-8 w-28 rounded-full" />
          ))}
        </div>
      )}
      {status === 'error' && (
        <ErrorState
          compact
          title="Couldn't load neighbouring countries"
          error={error}
          onRetry={retry}
        />
      )}
      {status === 'success' &&
        (neighbours.length > 0 ? (
          <NeighbourList countries={neighbours} />
        ) : (
          <p className="text-fg-muted">{country.name} has no land borders.</p>
        ))}
    </Section>
  );
}

function PlanBand({ country }) {
  return (
    <section
      aria-labelledby="plan-band-heading"
      className="flex flex-col gap-4 rounded-2xl border border-line bg-primary-soft/60 p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 id="plan-band-heading" className="text-xl font-bold text-fg">
          Ready to explore {country.name}?
        </h2>
        <p className="mt-1 text-fg-muted">
          Turn the sights you like into a day-by-day plan with a budget and booking links.
        </p>
      </div>
      <Link
        to={`/trips/new?country=${country.code}`}
        className={`${buttonStyles.primary} self-start sm:self-auto`}
      >
        Start planning {country.name}
      </Link>
    </section>
  );
}

function getHeader(status, country, error) {
  if (status === 'success') {
    return {
      title: country.name,
      description: [
        country.officialName !== country.name ? country.officialName : null,
        country.subregion ?? country.region,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  }
  if (status === 'error') {
    return { title: error?.status === 404 ? 'Country not found' : 'Country details' };
  }
  return { title: 'Loading country…' };
}

/**
 * The hero (and its <h1>) stays at the same position in every state, so the element that
 * receives focus on navigation is kept, not replaced, when the data arrives.
 */
export default function CountryPage() {
  const { code } = useParams();
  const { data: country, status, error, retry } = useCountry(code);
  const isLoaded = status === 'success';
  const header = getHeader(status, country, error);
  useDocumentTitle(header.title);

  let body;
  if (isLoaded) {
    body = (
      <div className="grid gap-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Section
            id="overview"
            title={`About ${country.name}`}
            description="Key facts at a glance."
          >
            <Facts country={country} />
          </Section>
          <WeatherSection country={country} />
        </div>
        <AttractionsSection country={country} />
        <NeighboursSection country={country} />
        <PlanBand country={country} />
      </div>
    );
  } else if (status === 'error' && error?.status === 404) {
    body = (
      <p className="text-fg-muted">
        We couldn&apos;t find a country with the code “{code}”.{' '}
        <Link to="/" className="font-medium text-primary hover:underline">
          Browse all countries
        </Link>
        .
      </p>
    );
  } else if (status === 'error') {
    body = <ErrorState title="Couldn't load this country" error={error} onRetry={retry} />;
  } else {
    body = (
      <div aria-busy="true" className="grid gap-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <CountryHero
        code={code}
        country={isLoaded ? country : null}
        title={header.title}
        description={header.description}
        actions={
          isLoaded && (
            <>
              <WishlistButton countryCode={country.code} countryName={country.name} />
              <Link to={`/trips/new?country=${country.code}`} className={buttonStyles.primary}>
                Plan a trip
              </Link>
            </>
          )
        }
      />
      <div className={`${pageContainer} py-8`}>{body}</div>
    </>
  );
}
