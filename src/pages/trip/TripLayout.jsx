import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { buttonStyles } from '../../components/common/buttonStyles.js';
import {
  CompassIcon,
  RouteIcon,
  SuitcaseIcon,
  WalletIcon,
} from '../../components/common/Icons.jsx';
import TripNotFound from '../../components/trips/TripNotFound.jsx';
import TripBanner from '../../components/trips/TripBanner.jsx';
import TripPrintView from '../../components/trips/TripPrintView.jsx';
import DownloadPdfButton from '../../components/trips/DownloadPdfButton.jsx';
import { usePrinting } from '../../hooks/usePrinting.js';
import { useTrip, useTrips } from '../../hooks/useTrips.js';

const TABS = [
  { to: '.', label: 'Overview', end: true, Icon: CompassIcon },
  { to: 'itinerary', label: 'Itinerary', Icon: RouteIcon },
  { to: 'budget', label: 'Budget', Icon: WalletIcon },
  { to: 'bookings', label: 'Bookings', Icon: SuitcaseIcon },
];

function tabClass({ isActive }) {
  return [
    'flex flex-col items-center gap-1 whitespace-nowrap rounded-xl px-1 py-2 text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:text-sm',
    isActive
      ? 'bg-primary text-on-primary shadow-card'
      : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
  ].join(' ');
}

/** Shell for one trip: header, actions, section tabs. Tabs read the trip via useOutletContext(). */
export default function TripLayout() {
  const { tripId } = useParams();
  const trip = useTrip(tripId);
  const { deleteTrip } = useTrips();
  const navigate = useNavigate();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const printing = usePrinting();

  if (!trip) return <TripNotFound />;

  function handleDelete() {
    setConfirmingDelete(false);
    navigate('/trips', { state: { notice: `Deleted “${trip.title}”.` } });
    deleteTrip(trip.id);
  }

  return (
    <>
      {/* Printing (Ctrl+P) shows only a plain summary of the whole trip instead of the current tab.
          The page is hidden only once that summary is rendered, so a browser that skips
          `beforeprint` prints the current tab instead of a blank page. */}
      {printing && <TripPrintView trip={trip} />}
      <div className={printing ? 'print:hidden' : undefined}>
        <Link
          to="/trips"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <span aria-hidden="true">←</span> All trips
        </Link>
        <div className="mb-6">
          <TripBanner
            trip={trip}
            actions={
              <>
                <DownloadPdfButton trip={trip} />
                <Link to={`/trips/${trip.id}/edit`} className={buttonStyles.secondary}>
                  Edit trip
                </Link>
                <button
                  type="button"
                  className={buttonStyles.dangerGhost}
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete trip
                </button>
              </>
            }
          />
        </div>

        <nav aria-label="Trip sections" className="mb-6">
          <ul className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-surface p-1 shadow-card sm:inline-flex sm:rounded-full">
            {TABS.map((tab) => (
              <li key={tab.label}>
                <NavLink to={tab.to} end={tab.end} className={tabClass}>
                  <tab.Icon className="size-4" />
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Outlet context={{ trip }} />
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete “${trip.title}”?`}
        description="This removes the trip with its itinerary, budget and saved links. It can't be undone."
        confirmLabel="Delete trip"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
