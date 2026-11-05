import { Link } from 'react-router';
import PageHeader from '../common/PageHeader.jsx';
import { buttonStyles } from '../common/buttonStyles.js';

/** Shown for an unknown :tripId (never created, deleted, or removed in another tab). */
export default function TripNotFound() {
  return (
    <>
      <PageHeader title="Trip not found" />
      <p className="text-fg-muted">
        This trip doesn&apos;t exist. It may have been deleted, possibly in another tab.
      </p>
      <Link to="/trips" className={`${buttonStyles.primary} mt-6`}>
        Go to my trips
      </Link>
    </>
  );
}
