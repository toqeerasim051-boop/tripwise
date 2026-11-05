import Photo from '../common/Photo.jsx';
import WaveDivider from '../common/WaveDivider.jsx';
import { GlobeIcon, MapPinIcon } from '../common/Icons.jsx';
import { getCuratedCountries, getDestinations } from '../../services/attractions.js';
import { useSlideshow } from '../../hooks/useSlideshow.js';
import { heroWebpSrcSet } from '../../utils/images.js';

/** Time each photo stays on screen. */
const SLIDE_MS = 5000;

const countryName = (code) =>
  code ? getCuratedCountries().find((country) => country.code === code)?.name : null;

/**
 * Full-width hero for the Explore page: a cross-fading slideshow of famous places (real photos,
 * see HERO_SLIDES in scripts/attractions-source.mjs) that always plays, with dots to jump to a photo. The page's
 * <h1> lives here (focus target on navigation). `children` is the search bar.
 */
export default function ExploreHero({ children }) {
  const { hero, slides = [] } = getDestinations();
  const photos = [hero, ...slides].filter(Boolean);
  const { index, seen, goTo } = useSlideshow(photos.length, SLIDE_MS);
  const current = photos[index];
  const country = countryName(current?.country);

  return (
    <section className="relative isolate overflow-hidden bg-scrim">
      {/* Only photos shown so far are mounted, so the next ones load when they are needed. */}
      {photos.slice(0, Math.min(seen + 1, photos.length)).map((photo, photoIndex) => (
        <Photo
          key={photo.src}
          src={photo.src}
          webpSrcSet={heroWebpSrcSet(photo.src) ?? undefined}
          sizes="100vw"
          alt=""
          eager={photoIndex === 0}
          className={`absolute inset-0 -z-20 size-full transition-[opacity,scale] [transition-duration:1200ms,7000ms] ease-out ${
            photoIndex === index ? 'scale-105 opacity-100' : 'scale-100 opacity-0'
          }`}
        />
      ))}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-scrim/85 via-scrim/50 to-scrim/10"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-linear-to-t from-scrim/70 to-transparent"
      />

      <div className="mx-auto max-w-content px-4 pt-14 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:pt-28">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-on-scrim/25 bg-on-scrim/10 px-3 py-1 text-xs font-semibold tracking-wide text-on-scrim uppercase backdrop-blur">
          <GlobeIcon className="size-3.5" />
          Discover the world
        </p>
        <h1
          tabIndex={-1}
          className="mt-5 max-w-3xl text-5xl leading-[1.05] font-bold text-on-scrim sm:text-6xl lg:text-7xl"
        >
          Explore the world{' '}
          <span className="block font-medium text-on-scrim-accent italic">without limits</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-on-scrim/90 sm:text-lg">
          Discover hand-picked destinations, plan your days in one click and keep your budget on
          track, all in one place.
        </p>
        <div className="mt-8">{children}</div>

        {photos.length > 1 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-on-scrim">
              <MapPinIcon className="size-4 shrink-0 text-on-scrim-accent" />
              <span>
                <span className="sr-only">Photo: </span>
                {current.name}
                {country && <span className="text-on-scrim/80"> · {country}</span>}
              </span>
            </p>
            <div className="flex items-center gap-1">
              <ul role="list" className="flex items-center">
                {photos.map((photo, photoIndex) => (
                  <li key={photo.src}>
                    <button
                      type="button"
                      onClick={() => goTo(photoIndex)}
                      aria-label={`Show photo ${photoIndex + 1} of ${photos.length}: ${photo.name}`}
                      aria-current={photoIndex === index ? 'true' : undefined}
                      className="group flex size-7 items-center justify-center"
                    >
                      <span
                        className={`h-2 rounded-full transition-all duration-300 ${
                          photoIndex === index
                            ? 'w-6 bg-on-scrim'
                            : 'w-2 bg-on-scrim/45 group-hover:bg-on-scrim/80'
                        }`}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      <WaveDivider className="absolute inset-x-0 -bottom-px text-canvas" />
    </section>
  );
}
