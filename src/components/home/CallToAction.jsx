import { Link } from 'react-router';
import Photo from '../common/Photo.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { getCoverPhoto } from '../../services/attractions.js';
import { coverWebpSrcSet } from '../../utils/images.js';

const PHOTO_COUNTRIES = ['NOR', 'ISL', 'NZL', 'CHE'];

/** Closing photo band: "Ready to start your adventure?" with the main actions. */
export default function CallToAction() {
  const photo = PHOTO_COUNTRIES.map(getCoverPhoto).find(Boolean);

  return (
    <section
      aria-labelledby="cta-heading"
      className="relative isolate mt-20 overflow-hidden rounded-3xl bg-scrim px-6 py-16 text-center sm:py-20"
    >
      {photo && (
        <Photo
          src={photo.large ?? photo.src}
          webpSrcSet={coverWebpSrcSet(photo) ?? undefined}
          sizes="(min-width: 1200px) 1200px, 100vw"
          alt=""
          className="absolute inset-0 -z-20 size-full"
        />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-scrim/65" />
      <h2 id="cta-heading" className="text-3xl font-bold text-on-scrim sm:text-5xl">
        Ready to start your <span className="text-on-scrim-accent italic">adventure?</span>
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-on-scrim/90 sm:text-lg">
        Pick a destination, let TripWise plan your days and keep your budget on track. Free, with no
        sign-up.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/trips/new" className={buttonStyles.primary}>
          Plan a trip
        </Link>
        <Link
          to="/trips"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-on-scrim/40 px-4 py-2 font-medium text-on-scrim hover:bg-on-scrim/10"
        >
          View my trips
        </Link>
      </div>
    </section>
  );
}
