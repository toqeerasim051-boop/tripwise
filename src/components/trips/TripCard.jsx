import { Link } from 'react-router';
import TripStatusBadge from './TripStatusBadge.jsx';
import Photo from '../common/Photo.jsx';
import { CalendarIcon } from '../common/Icons.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { getCoverPhoto } from '../../services/attractions.js';
import { formatDateRange, tripLengthInDays } from '../../utils/dates.js';
import { formatTimestamp, pluralize } from '../../utils/formatters.js';
import { countActivities } from '../../utils/tripModel.js';

function FlagBackdrop({ trip }) {
  return (
    <div className="flex size-full items-center justify-center bg-surface-muted p-6">
      {trip.flagUrl && (
        <img
          src={trip.flagUrl}
          alt=""
          loading="lazy"
          className="max-h-full max-w-full rounded-sm object-contain shadow-sm"
        />
      )}
    </div>
  );
}

/** Saved-trip summary. The title link covers the card; Edit/Delete sit above it. */
export default function TripCard({ trip, onDelete }) {
  const cover = getCoverPhoto(trip.countryCode);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="relative aspect-video overflow-hidden">
        <Photo
          src={cover?.src}
          alt=""
          className="size-full bg-surface-muted transition-transform duration-500 group-hover:scale-105"
          fallback={<FlagBackdrop trip={trip} />}
        />
        <div className="absolute top-3 left-3">
          <TripStatusBadge trip={trip} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2.5">
          {trip.flagUrl && (
            <img
              src={trip.flagUrl}
              alt=""
              loading="lazy"
              className="size-7 shrink-0 rounded-full border border-line object-cover"
            />
          )}
          <div className="min-w-0">
            <h2 className="text-base leading-snug font-semibold wrap-break-word text-fg">
              <Link
                to={`/trips/${trip.id}`}
                className="rounded-sm after:absolute after:inset-0 after:content-[''] hover:text-primary"
              >
                {trip.title}
              </Link>
            </h2>
            <p className="text-sm text-fg-muted">{trip.destinationName}</p>
          </div>
        </div>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg">
          <CalendarIcon className="size-4 text-fg-muted" />
          <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
          <span className="text-fg-muted">
            · {pluralize(tripLengthInDays(trip.startDate, trip.endDate), 'day')}
          </span>
        </p>

        <p className="text-sm text-fg-muted">
          {pluralize(countActivities(trip), 'activity', 'activities')} · Last edited{' '}
          {formatTimestamp(trip.updatedAt)}
        </p>

        <div className="relative z-10 mt-auto flex flex-wrap gap-2">
          <Link
            to={`/trips/${trip.id}/edit`}
            className={`${buttonStyles.secondary} ${buttonStyles.small}`}
          >
            <span>
              Edit <span className="sr-only">{trip.title}</span>
            </span>
          </Link>
          <button
            type="button"
            className={`${buttonStyles.dangerGhost} ${buttonStyles.small}`}
            onClick={() => onDelete(trip)}
          >
            <span>
              Delete <span className="sr-only">{trip.title}</span>
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
