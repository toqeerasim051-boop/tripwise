import { getTripStatus } from '../../utils/tripModel.js';
import { todayIso } from '../../utils/dates.js';

const STATUS = {
  upcoming: { label: 'Upcoming', className: 'bg-primary-soft text-fg' },
  ongoing: { label: 'In progress', className: 'bg-primary text-on-primary' },
  past: { label: 'Past', className: 'bg-surface-muted text-fg-muted' },
};

/** Text label (not colour alone) for where the trip sits relative to today. */
export default function TripStatusBadge({ trip, today = todayIso() }) {
  const status = STATUS[getTripStatus(trip, today)];
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}
    >
      {status.label}
    </span>
  );
}
