import { Link } from 'react-router';
import WishlistButton from '../common/WishlistButton.jsx';
import Photo from '../common/Photo.jsx';
import { AreaIcon, ArrowRightIcon, SparklesIcon, UsersIcon } from '../common/Icons.jsx';
import { getCoverPhoto } from '../../services/attractions.js';
import { formatCompactNumber, formatNumber } from '../../utils/formatters.js';

function FlagBackdrop({ country }) {
  return (
    <div className="flex size-full items-center justify-center bg-surface-muted p-6">
      {country.flagUrl && (
        <img
          src={country.flagUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="max-h-full max-w-full rounded-sm object-contain shadow-sm"
        />
      )}
    </div>
  );
}

/**
 * Country card: a destination photo when one is curated (the flag otherwise), name, region and
 * key numbers. The name link is stretched over the whole card; the wishlist button and any
 * `children` (extra actions) sit above it so they stay independently clickable.
 * Images are decorative (alt="") because the country name is the card's text.
 */
export default function CountryCard({
  country,
  linkState,
  featured = false,
  headingLevel = 2,
  children,
}) {
  const cover = getCoverPhoto(country.code);
  const Heading = 'h' + headingLevel;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="relative aspect-4/3 overflow-hidden">
        <Photo
          src={cover?.src}
          alt=""
          className="size-full bg-surface-muted transition-transform duration-500 group-hover:scale-105"
          fallback={<FlagBackdrop country={country} />}
        />
        {featured && cover && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-on-primary shadow-sm">
            <SparklesIcon className="size-3.5" />
            Top pick
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5 pr-1">
          {country.flagUrl && (
            <img
              src={country.flagUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-7 shrink-0 rounded-full border border-line object-cover"
            />
          )}
          <div className="min-w-0">
            <Heading className="truncate text-base leading-snug font-semibold text-fg">
              <Link
                to={`/countries/${country.code}`}
                state={linkState}
                className="rounded-sm after:absolute after:inset-0 after:content-[''] hover:text-primary"
              >
                {country.name}
              </Link>
            </Heading>
            <p className="truncate text-xs text-fg-muted">
              {country.capital ? `${country.capital} · ${country.region}` : country.region}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-fg-muted">
          <dl className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
            <div className="flex items-center gap-1">
              <dt>
                <UsersIcon className="size-3.5" />
                <span className="sr-only">Population</span>
              </dt>
              <dd className="font-medium text-fg">{formatCompactNumber(country.population)}</dd>
            </div>
            {country.areaKm2 !== null && country.areaKm2 !== undefined && (
              <div className="flex items-center gap-1">
                <dt>
                  <AreaIcon className="size-3.5" />
                  <span className="sr-only">Area</span>
                </dt>
                <dd className="font-medium text-fg">{formatNumber(country.areaKm2)} km²</dd>
              </div>
            )}
          </dl>
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-fg-muted transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary"
          >
            <ArrowRightIcon className="size-4" />
          </span>
        </div>

        {children && <div className="relative z-10 flex flex-wrap gap-2">{children}</div>}
      </div>

      <WishlistButton
        variant="icon"
        countryCode={country.code}
        countryName={country.name}
        className="absolute top-3 right-3 z-10 shadow-sm"
      />
    </article>
  );
}
