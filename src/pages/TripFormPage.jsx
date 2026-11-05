import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import PageHeader from '../components/common/PageHeader.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { buttonStyles } from '../components/common/buttonStyles.js';
import TripForm from '../components/trips/TripForm.jsx';
import TripNotFound from '../components/trips/TripNotFound.jsx';
import { useCountries } from '../hooks/useCountries.js';
import { useTrips } from '../hooks/useTrips.js';
import { createTrip, updateTripDetails } from '../utils/tripModel.js';
import { getDaysLosingContent } from '../utils/itinerary.js';
import { formatDate } from '../utils/dates.js';
import { formatList, pluralize } from '../utils/formatters.js';

const COUNTRY_CODE = /^[A-Z]{3}$/;

/** Handles both /trips/new (optionally ?country=FRA from "Plan a trip") and /trips/:tripId/edit. */
export default function TripFormPage() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { trips, createTrip: addTrip, updateTrip } = useTrips();
  const countries = useCountries();
  const [pendingValues, setPendingValues] = useState(null);

  const trip = tripId ? (trips.find((item) => item.id === tripId) ?? null) : null;
  const countryByCode = useMemo(
    () => new Map((countries.data ?? []).map((country) => [country.code, country])),
    [countries.data],
  );

  if (tripId && !trip) return <TripNotFound />;

  const prefillCode = searchParams.get('country')?.toUpperCase() ?? '';
  const initialValues = trip
    ? {
        title: trip.title,
        countryCode: trip.countryCode,
        startDate: trip.startDate,
        endDate: trip.endDate,
      }
    : {
        title: '',
        countryCode: COUNTRY_CODE.test(prefillCode) ? prefillCode : '',
        startDate: '',
        endDate: '',
      };

  function save(values) {
    const now = new Date().toISOString();
    if (trip) {
      const destination =
        values.countryCode === trip.countryCode ? null : countryByCode.get(values.countryCode);
      updateTrip(updateTripDetails(trip, { values, destination, now }));
      navigate(`/trips/${trip.id}`);
    } else {
      const newTrip = createTrip({
        values,
        destination: countryByCode.get(values.countryCode),
        now,
      });
      addTrip(newTrip);
      navigate(`/trips/${newTrip.id}`);
    }
  }

  function handleSubmit(values) {
    if (trip && getDaysLosingContent(trip.days, values.startDate, values.endDate).length > 0) {
      setPendingValues(values); // ask before dropping planned days
      return;
    }
    save(values);
  }

  const losingDays = pendingValues
    ? getDaysLosingContent(trip.days, pendingValues.startDate, pendingValues.endDate)
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Trip planner"
        title={trip ? 'Edit trip' : 'Plan a new trip'}
        description={
          trip
            ? `Update the details of “${trip.title}”.`
            : 'Choose where and when. You can add day-by-day plans and a budget next.'
        }
      />
      <TripForm
        // Remount when switching between trips so the form starts from the right values.
        key={trip?.id ?? 'new'}
        initialValues={initialValues}
        countries={countries}
        currentDestination={trip ? { code: trip.countryCode, name: trip.destinationName } : null}
        lockedCurrency={trip?.currency ?? null}
        submitLabel={trip ? 'Save changes' : 'Create trip'}
        onSubmit={handleSubmit}
        cancelAction={
          <Link to={trip ? `/trips/${trip.id}` : '/trips'} className={buttonStyles.secondary}>
            Cancel
          </Link>
        }
      />
      <ConfirmDialog
        open={pendingValues !== null}
        title={`Remove ${pluralize(losingDays.length, 'planned day')}?`}
        description={
          <p>
            The new dates leave out{' '}
            {formatList(losingDays.map((day) => formatDate(day.date, { dateStyle: 'medium' })))},
            which {losingDays.length === 1 ? 'has' : 'have'} activities or notes. They will be
            deleted.
          </p>
        }
        confirmLabel="Remove and save"
        onCancel={() => setPendingValues(null)}
        onConfirm={() => {
          const values = pendingValues;
          setPendingValues(null);
          save(values);
        }}
      />
    </>
  );
}
