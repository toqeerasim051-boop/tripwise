import PageHeader from '../components/common/PageHeader.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import ExternalLink from '../components/common/ExternalLink.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import { useAllAttractions } from '../hooks/useAttractions.js';
import { getDestinations } from '../services/attractions.js';

const SOURCES = [
  {
    name: 'REST Countries',
    href: 'https://restcountries.com',
    use: 'Country facts: capitals, languages, currencies, population and flags.',
  },
  {
    name: 'Open-Meteo',
    href: 'https://open-meteo.com',
    use: 'Weather data, licensed under CC BY 4.0.',
  },
  {
    name: 'Wikipedia',
    href: 'https://en.wikipedia.org',
    use: 'Attraction descriptions, licensed under CC BY-SA 4.0.',
  },
  {
    name: 'Wikimedia Commons',
    href: 'https://commons.wikimedia.org',
    use: 'Destination photos. Each photographer and licence is listed below.',
  },
  {
    name: 'OpenStreetMap',
    href: 'https://www.openstreetmap.org/copyright',
    use: 'Map tiles on country pages, © OpenStreetMap contributors (ODbL). Shown with Leaflet.',
  },
];

function PhotoList({ photos }) {
  return (
    <ul role="list" className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {photos.map(({ key, name, credit }) => (
        <li key={key} className="min-w-0">
          <ExternalLink href={credit.filePage}>{name}</ExternalLink>
          <span className="block text-fg-muted">
            {credit.artist} · {credit.license}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * About TripWise: what it is, privacy, and the data sources and photo attribution every
 * Creative Commons photo requires (linked from the footer as "About").
 */
export default function AboutPage() {
  const { data: countries, status, error, retry } = useAllAttractions();
  const { hero, slides = [] } = getDestinations();

  const photos =
    status === 'success'
      ? Object.entries(countries)
          .flatMap(([code, list]) =>
            list
              .filter((item) => item.image)
              .map((item) => ({ key: `${code}-${item.id}`, name: item.name, ...item.image })),
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];
  const homePhotos = [hero, ...slides].filter(Boolean).map((photo) => ({
    key: `home-${photo.src}`,
    name: `${photo.name} (homepage)`,
    credit: photo.credit,
  }));
  photos.unshift(...homePhotos);

  return (
    <>
      <PageHeader
        eyebrow="About"
        title="About TripWise"
        description="A free travel planner: explore destinations, plan your days and keep your budget on track."
      />

      <section aria-labelledby="about-heading" className="mb-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 id="about-heading" className="text-xl font-bold text-fg">
            What TripWise does
          </h2>
          <p className="mt-2 text-fg-muted">
            TripWise helps you choose a destination, plan each day, watch the weather and track your
            spending. It never books or charges anything: booking links open the partner’s own site.
          </p>
        </div>
        <div id="privacy" className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-xl font-bold text-fg">Your privacy</h2>
          <p className="mt-2 text-fg-muted">
            There is no account and no tracking. Your trips and wishlist are saved only in this
            browser. TripWise asks public services for country facts, weather and map tiles, and
            sends them nothing about you.
          </p>
        </div>
      </section>

      <section aria-labelledby="sources-heading" className="mb-10">
        <h2 id="sources-heading" className="mb-4 text-xl font-bold text-fg">
          Data sources
        </h2>
        <ul role="list" className="grid gap-4 sm:grid-cols-2">
          {SOURCES.map((source) => (
            <li key={source.name} className="rounded-2xl border border-line bg-surface p-4">
              <ExternalLink href={source.href}>{source.name}</ExternalLink>
              <p className="mt-1 text-sm text-fg-muted">{source.use}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="photos-heading" aria-busy={status === 'loading'}>
        <h2 id="photos-heading" className="mb-1 text-xl font-bold text-fg">
          Photo credits
        </h2>
        <p className="mb-5 text-sm text-fg-muted">
          Photo name, photographer and licence. Each link opens the photo&apos;s page on Wikimedia
          Commons with the full licence.
        </p>
        {status === 'loading' && (
          <div className="grid gap-2">
            <span className="sr-only">Loading photo credits…</span>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        )}
        {status === 'error' && (
          <ErrorState compact title="Couldn't load photo credits" error={error} onRetry={retry} />
        )}
        {status === 'success' && <PhotoList photos={photos} />}
      </section>
    </>
  );
}
