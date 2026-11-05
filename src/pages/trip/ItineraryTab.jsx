import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ActivityForm from '../../components/itinerary/ActivityForm.jsx';
import DayCard from '../../components/itinerary/DayCard.jsx';
import MoveActivityDialog from '../../components/itinerary/MoveActivityDialog.jsx';
import AutoPlanDialog from '../../components/itinerary/AutoPlanDialog.jsx';
import { SparklesIcon } from '../../components/common/Icons.jsx';
import { buttonStyles } from '../../components/common/buttonStyles.js';
import AttractionSuggestions from '../../components/attractions/AttractionSuggestions.jsx';
import AddToTripDialog from '../../components/attractions/AddToTripDialog.jsx';
import { useAttractions } from '../../hooks/useAttractions.js';
import { useTrips } from '../../hooks/useTrips.js';
import { useWeather } from '../../hooks/useWeather.js';
import { attractionToActivityValues } from '../../utils/attractions.js';
import { planAttractions } from '../../utils/autoPlan.js';
import { todayIso } from '../../utils/dates.js';
import { forecastByDate, getWeatherWarnings } from '../../utils/weatherAdvice.js';
import { pluralize } from '../../utils/formatters.js';
import { countActivities } from '../../utils/tripModel.js';
import {
  EMPTY_ACTIVITY_VALUES,
  activityToValues,
  dayDateLabel,
  dayLabel,
} from '../../utils/itinerary.js';

/**
 * Finds the element a pending focus request points at. Falls back through the listed controls
 * (e.g. "up" is disabled once the item reaches the top), then to the day's Add button.
 */
function findFocusTarget(root, { activityId, controls, dayId }) {
  if (activityId) {
    const item = root.querySelector(`[data-activity-id="${activityId}"]`);
    for (const control of controls) {
      const button = item?.querySelector(`[data-control="${control}"]`);
      if (button && !button.disabled) return button;
    }
  }
  return root.querySelector(`[data-day-id="${dayId}"] [data-control="add"]`);
}

export default function ItineraryTab() {
  const { trip } = useOutletContext();
  const trips = useTrips();
  const [form, setForm] = useState(null); // { mode: 'add' | 'edit', day, activity? }
  const [moving, setMoving] = useState(null); // { day, activity }
  const [deleting, setDeleting] = useState(null); // { day, activity, index }
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef(null);
  const pendingFocus = useRef(null);
  const { data: attractions, status: attractionsStatus } = useAttractions(trip.countryCode);
  const [suggesting, setSuggesting] = useState(null);
  const [autoPlan, setAutoPlan] = useState(null); // plan snapshot shown in the preview dialog
  // Weather is an optional extra here: a failed or missing forecast just shows no advice.
  const { data: forecast, status: weatherStatus } = useWeather(trip.lat, trip.lon);
  const byDate = forecastByDate(weatherStatus === 'success' ? forecast : null);
  const warnings = getWeatherWarnings(trip.days, byDate);
  const proposal =
    attractionsStatus === 'success'
      ? planAttractions(trip.days, attractions, byDate, todayIso())
      : null;

  // Moving or removing an item re-inserts/removes DOM nodes, which drops focus in browsers;
  // put it back on the equivalent control after the re-render.
  useEffect(() => {
    if (!pendingFocus.current || !rootRef.current) return;
    findFocusTarget(rootRef.current, pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  const labelOf = (day) => dayLabel(trip.days.findIndex((item) => item.id === day.id));
  const total = countActivities(trip);
  const plannedDays = trip.days.filter((day) => day.activities.length > 0).length;

  const handlers = {
    onAdd: (day) => setForm({ mode: 'add', day }),
    onEdit: (day, activity) => setForm({ mode: 'edit', day, activity }),
    onDelete: (day, activity, index) => setDeleting({ day, activity, index }),
    onMoveToDay: (day, activity) => setMoving({ day, activity }),
    onMove: (day, activity, toIndex) => {
      trips.moveActivity(trip.id, activity.id, day.id, toIndex);
      const position = Math.max(0, Math.min(toIndex, day.activities.length - 1)) + 1;
      setAnnouncement(
        `Moved “${activity.title}” to position ${position} of ${day.activities.length} in ${labelOf(day)}.`,
      );
      const direction = toIndex < day.activities.indexOf(activity) ? 'up' : 'down';
      pendingFocus.current = {
        activityId: activity.id,
        controls: direction === 'up' ? ['up', 'down'] : ['down', 'up'],
        dayId: day.id,
      };
    },
    onSortByTime: (day) => {
      trips.sortDayByTime(trip.id, day.id);
      setAnnouncement(`Sorted ${labelOf(day)} by time.`);
    },
    onSaveNotes: (day, notes) => {
      trips.updateDayNotes(trip.id, day.id, notes);
      setAnnouncement(`Saved notes for ${labelOf(day)}.`);
    },
    onMoveOutdoor: (day, warning) => {
      const target = trip.days.find((item) => item.id === warning.dryDayId);
      warning.activities.forEach((activity, index) =>
        trips.moveActivity(trip.id, activity.id, target.id, target.activities.length + index),
      );
      const [first] = warning.activities;
      pendingFocus.current = { activityId: first.id, controls: ['move', 'edit'], dayId: target.id };
      setAnnouncement(
        `Moved ${pluralize(warning.activities.length, 'outdoor plan')} from ${labelOf(day)} to ${labelOf(target)}.`,
      );
    },
  };

  function openAutoPlan() {
    setAutoPlan({
      ...proposal,
      entries: proposal.entries.map((entry) => ({
        ...entry,
        label: labelOf(entry.day),
        dateLabel: dayDateLabel(entry.day),
      })),
    });
  }

  function confirmAutoPlan() {
    let count = 0;
    autoPlan.entries.forEach((entry) =>
      entry.attractions.forEach((attraction) => {
        trips.addActivity(trip.id, entry.day.id, attractionToActivityValues(attraction));
        count += 1;
      }),
    );
    setAnnouncement(
      `Added ${pluralize(count, 'sight')} across ${pluralize(autoPlan.entries.length, 'day')}.`,
    );
    setAutoPlan(null); // focus returns to the Auto-plan button
  }

  function submitForm(values) {
    if (form.mode === 'add') {
      trips.addActivity(trip.id, form.day.id, values);
      setAnnouncement(`Added “${values.title.trim()}” to ${labelOf(form.day)}.`);
    } else {
      trips.updateActivity(trip.id, form.activity, values);
      setAnnouncement(`Saved “${values.title.trim()}”.`);
    }
    setForm(null); // focus returns to the Add/Edit button that opened the form
  }

  function addSuggestion(_trip, day, dayIndex) {
    trips.addActivity(trip.id, day.id, attractionToActivityValues(suggesting));
    setAnnouncement(`Added “${suggesting.name}” to ${dayLabel(dayIndex)}.`);
    setSuggesting(null); // focus returns to the suggestion's Add button
  }

  function confirmDelete() {
    const { day, activity, index } = deleting;
    const remaining = day.activities.filter((item) => item.id !== activity.id);
    const neighbour = remaining[Math.min(index, remaining.length - 1)];
    pendingFocus.current = { activityId: neighbour?.id, controls: ['edit'], dayId: day.id };
    trips.deleteActivity(trip.id, activity.id);
    setAnnouncement(`Deleted “${activity.title}”.`);
    setDeleting(null);
  }

  function moveToDay(toDayId) {
    const { activity } = moving;
    const target = trip.days.find((day) => day.id === toDayId);
    // The item is re-created inside another day's list (keys only persist within one parent),
    // so the dialog's opener is gone; focus the new "Move…" button instead.
    pendingFocus.current = { activityId: activity.id, controls: ['move', 'edit'], dayId: toDayId };
    trips.moveActivity(trip.id, activity.id, toDayId, target.activities.length);
    setAnnouncement(`Moved “${activity.title}” to ${labelOf(target)}.`);
    setMoving(null);
  }

  return (
    <section aria-labelledby="itinerary-heading" ref={rootRef}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="itinerary-heading" className="text-lg font-semibold text-fg">
          Itinerary
        </h2>
        <p className="text-sm text-fg-muted">
          {pluralize(total, 'activity', 'activities')} across {plannedDays} of{' '}
          {pluralize(trip.days.length, 'day')}
        </p>
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {proposal && proposal.entries.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-linear-to-r from-primary-soft to-surface p-5 shadow-card">
          <div>
            <p className="flex items-center gap-2 font-semibold text-fg">
              <SparklesIcon className="size-5 text-primary" />
              Plan my days for me
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              Spread the top sights in {trip.destinationName} over your trip. Nearby sights share a
              day, and rainy days stay light.
            </p>
          </div>
          <button type="button" className={buttonStyles.primary} onClick={openAutoPlan}>
            Auto-plan my days
          </button>
        </div>
      )}

      <ol role="list" className="grid gap-4">
        {trip.days.map((day, index) => {
          const dayForecast = byDate.get(day.date);
          const warning = warnings.get(day.id);
          const dryDay = warning && trip.days.find((item) => item.id === warning.dryDayId);
          return (
            <li key={day.id}>
              <DayCard
                day={day}
                label={dayLabel(index)}
                dateLabel={dayDateLabel(day)}
                isOnlyDay={trip.days.length === 1}
                handlers={handlers}
                weather={dayForecast && { forecast: dayForecast, unit: forecast.units.temperature }}
                warning={warning && { ...warning, dryDayLabel: dryDay ? labelOf(dryDay) : null }}
              />
            </li>
          );
        })}
      </ol>

      <AutoPlanDialog
        plan={autoPlan}
        onConfirm={confirmAutoPlan}
        onCancel={() => setAutoPlan(null)}
      />

      {/* Optional extra: shown only once loaded, never as an error. */}
      {attractionsStatus === 'success' && attractions.length > 0 && (
        <AttractionSuggestions
          countryName={trip.destinationName}
          attractions={attractions}
          onAdd={setSuggesting}
        />
      )}
      <AddToTripDialog
        attraction={suggesting}
        trips={[trip]}
        country={{ code: trip.countryCode, name: trip.destinationName }}
        onAdd={addSuggestion}
        onClose={() => setSuggesting(null)}
      />

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={
          form?.mode === 'edit'
            ? `Edit “${form.activity.title}”`
            : `Add activity to ${form ? labelOf(form.day) : ''}`
        }
      >
        {form && (
          <ActivityForm
            initialValues={
              form.mode === 'edit' ? activityToValues(form.activity) : EMPTY_ACTIVITY_VALUES
            }
            submitLabel={form.mode === 'edit' ? 'Save activity' : 'Add activity'}
            onSubmit={submitForm}
            onCancel={() => setForm(null)}
          />
        )}
      </Modal>

      <MoveActivityDialog
        open={moving !== null}
        activityTitle={moving?.activity.title ?? ''}
        days={trip.days
          .map((day, index) => ({
            id: day.id,
            label: dayLabel(index),
            dateLabel: dayDateLabel(day),
            count: day.activities.length,
          }))
          .filter((day) => day.id !== moving?.day.id)}
        onSelect={moveToDay}
        onCancel={() => setMoving(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting?.activity.title ?? ''}”?`}
        description="This activity will be removed from your itinerary."
        confirmLabel="Delete activity"
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
