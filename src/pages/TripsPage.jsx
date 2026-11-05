import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Reveal from '../components/common/Reveal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { buttonStyles } from '../components/common/buttonStyles.js';
import TripCard from '../components/trips/TripCard.jsx';
import BackupPanel from '../components/trips/BackupPanel.jsx';
import { useTrips } from '../hooks/useTrips.js';
import { useWishlist } from '../hooks/useWishlist.js';
import { sortTripsByUpdated } from '../utils/tripModel.js';
import { pluralize } from '../utils/formatters.js';
import { todayIso } from '../utils/dates.js';
import { downloadJson } from '../utils/download.js';
import {
  BackupError,
  MAX_BACKUP_BYTES,
  backupFileName,
  createBackup,
  parseBackup,
} from '../utils/backup.js';

export default function TripsPage() {
  const { trips, deleteTrip, importTrips } = useTrips();
  const wishlist = useWishlist();
  const [importError, setImportError] = useState('');
  const [tripToDelete, setTripToDelete] = useState(null);
  // A notice can arrive via navigation state (e.g. after deleting from the trip page).
  const location = useLocation();
  const [notice, setNotice] = useState(location.state?.notice ?? '');
  const sortedTrips = sortTripsByUpdated(trips);

  function confirmDelete() {
    deleteTrip(tripToDelete.id);
    setNotice(`Deleted “${tripToDelete.title}”.`);
    setTripToDelete(null);
  }

  function exportData() {
    const fileName = backupFileName(todayIso());
    downloadJson(
      fileName,
      createBackup({ trips, wishlist: wishlist.items, exportedAt: new Date().toISOString() }),
    );
    setImportError('');
    setNotice(
      `Exported ${pluralize(trips.length, 'trip')} and ${pluralize(wishlist.count, 'wishlist destination')} to ${fileName}.`,
    );
  }

  async function importData(file) {
    setImportError('');
    if (file.size > MAX_BACKUP_BYTES) {
      setImportError('This file is too large to be a TripWise backup.');
      return;
    }
    try {
      const data = parseBackup(await file.text());
      importTrips(data.trips);
      wishlist.importItems(data.wishlist);
      setNotice(
        `Imported ${pluralize(data.trips.length, 'trip')} and ${pluralize(data.wishlist.length, 'wishlist destination')} from ${file.name}.`,
      );
    } catch (error) {
      if (error instanceof BackupError) {
        setImportError(error.message);
      } else {
        console.error('Import failed', error);
        setImportError("This file couldn't be read. Try exporting it again.");
      }
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Your journeys"
        title="My trips"
        description={
          trips.length > 0
            ? `${pluralize(trips.length, 'saved trip')}, most recently edited first.`
            : 'Create, reopen and manage your saved trips.'
        }
        actions={
          <Link to="/trips/new" className={buttonStyles.primary}>
            New trip
          </Link>
        }
      />

      {/* Always rendered so screen readers announce changes to it. */}
      <p role="status" className={notice ? 'mb-4 text-sm font-medium text-success' : 'sr-only'}>
        {notice}
      </p>

      {sortedTrips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          description="Plan your first trip, or start from a destination on your wishlist."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/trips/new" className={buttonStyles.primary}>
                Plan a trip
              </Link>
              <Link to="/wishlist" className={buttonStyles.secondary}>
                Open wishlist
              </Link>
            </div>
          }
        />
      ) : (
        <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTrips.map((trip, index) => (
            <Reveal as="li" key={trip.id} delay={(index % 3) * 80}>
              <TripCard trip={trip} onDelete={setTripToDelete} />
            </Reveal>
          ))}
        </ul>
      )}

      <BackupPanel onExport={exportData} onImport={importData} error={importError} />

      <ConfirmDialog
        open={tripToDelete !== null}
        title={tripToDelete ? `Delete “${tripToDelete.title}”?` : ''}
        description="This removes the trip with its itinerary, budget and saved links. It can't be undone."
        confirmLabel="Delete trip"
        onCancel={() => setTripToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
