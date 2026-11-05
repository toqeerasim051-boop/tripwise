import { Link, useLocation } from 'react-router';
import Photo from '../common/Photo.jsx';
import { ArrowLeftIcon } from '../common/Icons.jsx';
import { getCoverPhoto } from '../../services/attractions.js';
import { coverWebpSrcSet } from '../../utils/images.js';

/**
 * Full-width country header: the curated cover photo (or a blurred flag), back link, flag,
 * the page's <h1> and actions. It renders in every loading state so the focused <h1> is kept.
 */
export default function CountryHero({ code, country, title, description, actions }) {
  const { state } = useLocation();
  const cover = getCoverPhoto(code);
  const backdrop = cover ? (
    <Photo
      src={cover.large ?? cover.src}
      webpSrcSet={coverWebpSrcSet(cover) ?? undefined}
      sizes="100vw"
      alt=""
      eager
      className="absolute inset-0 -z-20 size-full"
    />
  ) : (
    country?.flagUrl && (
      <img
        src={country.flagUrl}
        alt=""
        className="absolute inset-0 -z-20 size-full scale-110 object-cover opacity-60 blur-md"
      />
    )
  );

  return (
    <section className="relative isolate overflow-hidden bg-scrim">
      {backdrop}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-scrim/90 via-scrim/45 to-scrim/25"
      />
      <div className="mx-auto flex min-h-72 max-w-content flex-col justify-between gap-12 px-4 pt-5 pb-6 sm:min-h-96 sm:px-6 sm:pb-8">
        <Link
          to={`/${state?.exploreSearch ?? ''}`}
          className="inline-flex items-center gap-1 self-start rounded-full bg-scrim/40 px-3 py-1.5 text-sm font-medium text-on-scrim backdrop-blur hover:bg-scrim/60"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Explore
        </Link>

        <div>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              {country?.flagUrl && (
                <img
                  src={country.flagUrl}
                  alt={country.flagAlt}
                  className="h-12 w-18 shrink-0 rounded-md border-2 border-on-scrim/80 object-cover shadow-lg sm:h-14 sm:w-21"
                />
              )}
              <div className="min-w-0">
                <h1
                  tabIndex={-1}
                  className="text-4xl font-extrabold tracking-tight wrap-break-word text-on-scrim sm:text-5xl"
                >
                  {title}
                </h1>
                {description && <p className="mt-1 text-on-scrim/85">{description}</p>}
              </div>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
