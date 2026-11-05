import { useRef } from 'react';
import { Link } from 'react-router';
import Photo from '../common/Photo.jsx';
import SectionHeading from './SectionHeading.jsx';
import { ArrowLeftIcon, ArrowRightIcon, MapPinIcon } from '../common/Icons.jsx';

const scrollButton =
  'inline-flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface text-fg shadow-card hover:bg-surface-muted';

/**
 * Swipeable row of famous places (one per curated country, real photos) linking to the country.
 * `places`: [{ code, name, country, src }]. The arrow buttons scroll the row on wide screens.
 */
export default function FamousPlaces({ places }) {
  const listRef = useRef(null);
  const scroll = (direction) =>
    listRef.current?.scrollBy({
      left: direction * listRef.current.clientWidth * 0.8,
      behavior: 'smooth',
    });

  return (
    <section aria-labelledby="famous-places-heading" className="mt-20">
      <SectionHeading
        id="famous-places-heading"
        eyebrow="Iconic places"
        title="Famous sights waiting for you"
        text="Real photos of the places travellers dream about. Open one to see its top attractions."
        action={
          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              className={scrollButton}
              onClick={() => scroll(-1)}
              aria-label="Scroll famous sights back"
            >
              <ArrowLeftIcon className="size-5" />
            </button>
            <button
              type="button"
              className={scrollButton}
              onClick={() => scroll(1)}
              aria-label="Scroll famous sights forward"
            >
              <ArrowRightIcon className="size-5" />
            </button>
          </div>
        }
      />
      <ul
        ref={listRef}
        role="list"
        className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto scroll-smooth px-4 pt-1 pb-6 sm:-mx-6 sm:gap-5 sm:px-6"
      >
        {places.map((place) => (
          <li key={place.code} className="w-60 shrink-0 snap-start sm:w-72">
            <Link
              to={`/countries/${place.code}`}
              className="group relative isolate flex aspect-3/4 flex-col justify-end overflow-hidden rounded-3xl bg-scrim p-5 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <Photo
                src={place.src}
                alt=""
                className="absolute inset-0 -z-20 size-full transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-linear-to-t from-scrim/90 via-scrim/25 to-transparent"
              />
              <span className="font-display text-xl leading-snug font-bold text-on-scrim">
                {place.name}
              </span>
              <span className="mt-1 flex items-center gap-1 text-sm text-on-scrim/85">
                <MapPinIcon className="size-4 shrink-0 text-on-scrim-accent" />
                {place.country}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
