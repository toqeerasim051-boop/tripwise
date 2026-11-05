import Photo from '../common/Photo.jsx';
import TripStatusBadge from './TripStatusBadge.jsx';
import { getCoverPhoto } from '../../services/attractions.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { formatDateRange, tripLengthInDays } from '../../utils/dates.js';
import { pluralize } from '../../utils/formatters.js';

/**
 * Trip header: destination photo (or the blurred flag), flag, title (the page's <h1>), dates,
 * status and `actions`.
 */
export default function TripBanner({ trip, actions }) {
  useDocumentTitle(trip.title);
  const cover = getCoverPhoto(trip.countryCode);

  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-scrim shadow-card">
      {cover ? (
        <Photo src={cover.large ?? cover.src} alt="" className="absolute inset-0 -z-20 size-full" />
      ) : (
        trip.flagUrl && (
          <img
            src={trip.flagUrl}
            alt=""
            className="absolute inset-0 -z-20 size-full scale-110 object-cover opacity-60 blur-md"
          />
        )
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-scrim/90 via-scrim/55 to-scrim/20"
      />
      <div className="flex min-h-56 flex-col justify-end gap-4 p-5 sm:min-h-64 sm:p-7 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 items-end gap-4">
          {trip.flagUrl && (
            <img
              src={trip.flagUrl}
              alt=""
              className="h-10 w-15 shrink-0 rounded-md border-2 border-on-scrim/80 object-cover shadow-lg sm:h-12 sm:w-18"
            />
          )}
          <div className="min-w-0">
            <TripStatusBadge trip={trip} />
            <h1
              tabIndex={-1}
              className="mt-2 text-3xl font-extrabold tracking-tight wrap-break-word text-on-scrim sm:text-4xl"
            >
              {trip.title}
            </h1>
            <p className="mt-1 text-on-scrim/85">
              {trip.destinationName} · {formatDateRange(trip.startDate, trip.endDate)} ·{' '}
              {pluralize(tripLengthInDays(trip.startDate, trip.endDate), 'day')}
            </p>
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
