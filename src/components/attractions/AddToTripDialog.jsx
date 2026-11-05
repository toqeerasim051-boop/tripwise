import { useState } from 'react';
import { Link } from 'react-router';
import Modal from '../common/Modal.jsx';
import FormField from '../common/FormField.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { inputStyles } from '../common/formStyles.js';
import { dayHasAttraction } from '../../utils/attractions.js';
import { dayDateLabel, dayLabel } from '../../utils/itinerary.js';
import { pluralize } from '../../utils/formatters.js';

function AddToTripForm({ attraction, trips, country, onAdd, onClose }) {
  const [tripId, setTripId] = useState(trips[0]?.id ?? '');
  const trip = trips.find((item) => item.id === tripId) ?? trips[0];
  const [dayId, setDayId] = useState(trip?.days[0]?.id ?? '');

  if (!trip) {
    return (
      <>
        <p className="mt-2 text-fg-muted">
          You don&apos;t have a trip to {country.name} yet. Plan one first, then add attractions to
          its days.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={buttonStyles.secondary} onClick={onClose}>
            Cancel
          </button>
          <Link
            to={`/trips/new?country=${country.code}`}
            data-autofocus
            className={buttonStyles.primary}
          >
            Plan a trip to {country.name}
          </Link>
        </div>
      </>
    );
  }

  const dayIndex = Math.max(
    0,
    trip.days.findIndex((day) => day.id === dayId),
  );
  const day = trip.days[dayIndex];
  const alreadyPlanned = day && dayHasAttraction(day, attraction);

  function changeTrip(nextTripId) {
    const nextTrip = trips.find((item) => item.id === nextTripId);
    setTripId(nextTripId);
    setDayId(nextTrip?.days[0]?.id ?? '');
  }

  return (
    <form
      className="mt-4 grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(trip, day, dayIndex);
      }}
    >
      {trips.length > 1 ? (
        <FormField id="add-attraction-trip" label="Trip" required>
          {(props) => (
            <select
              {...props}
              data-autofocus
              value={trip.id}
              onChange={(event) => changeTrip(event.target.value)}
              className={inputStyles}
            >
              {trips.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          )}
        </FormField>
      ) : (
        <p className="text-sm text-fg-muted">
          Trip: <span className="font-semibold text-fg">{trip.title}</span>
        </p>
      )}

      <FormField
        id="add-attraction-day"
        label="Day"
        required
        hint={alreadyPlanned ? `“${attraction.name}” is already planned on this day.` : undefined}
      >
        {(props) => (
          <select
            {...props}
            data-autofocus={trips.length > 1 ? undefined : true}
            value={day?.id ?? ''}
            onChange={(event) => setDayId(event.target.value)}
            className={inputStyles}
          >
            {trip.days.map((item, index) => (
              <option key={item.id} value={item.id}>
                {dayLabel(index)} · {dayDateLabel(item)} (
                {pluralize(item.activities.length, 'activity', 'activities')})
              </option>
            ))}
          </select>
        )}
      </FormField>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={buttonStyles.secondary} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className={buttonStyles.primary}>
          Add to {dayLabel(dayIndex)}
        </button>
      </div>
    </form>
  );
}

/**
 * Adds a curated attraction to a day of one of the user's trips to this country.
 * `trips` are the candidate trips (same destination), most recently edited first.
 * `onAdd(trip, day, dayIndex)` performs the change.
 */
export default function AddToTripDialog({ attraction, trips, country, onAdd, onClose }) {
  return (
    <Modal
      open={attraction !== null}
      onClose={onClose}
      title={attraction ? `Add “${attraction.name}” to a trip` : ''}
      description="It's added as a sightseeing activity at the end of the chosen day."
    >
      {attraction && (
        <AddToTripForm
          key={attraction.id}
          attraction={attraction}
          trips={trips}
          country={country}
          onAdd={onAdd}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
