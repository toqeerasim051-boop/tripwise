/** Pure itinerary helpers. Days are kept one-per-date, ordered by date. */
import { eachDayInRange, formatDate } from './dates.js';
import { normalizeUrl } from './bookingLinks.js';
import { ACTIVITY_CATEGORIES } from './constants.js';

/** Upper bound for stored trips (forms enforce the stricter LIMITS.tripMaxDays). */
export const MAX_STORED_TRIP_DAYS = 366;

export function createDay(date, createId) {
  return { id: createId(), date, notes: '', activities: [] };
}

export function buildDays(startDate, endDate, createId) {
  return eachDayInRange(startDate, endDate, { max: MAX_STORED_TRIP_DAYS }).map((date) =>
    createDay(date, createId),
  );
}

/**
 * Fits existing days to a new date range: days whose date is still in range are kept (with their
 * notes and activities), new dates get empty days, dates outside the range are dropped.
 */
export function reconcileDays(days, startDate, endDate, createId) {
  const byDate = new Map(days.map((day) => [day.date, day]));
  return eachDayInRange(startDate, endDate, { max: MAX_STORED_TRIP_DAYS }).map(
    (date) => byDate.get(date) ?? createDay(date, createId),
  );
}

/** Days that a new date range would drop and that still hold user content. */
export function getDaysLosingContent(days, startDate, endDate) {
  const kept = new Set(eachDayInRange(startDate, endDate, { max: MAX_STORED_TRIP_DAYS }));
  return days.filter(
    (day) => !kept.has(day.date) && (day.activities.length > 0 || day.notes.trim() !== ''),
  );
}

// ---------- activities (all helpers return the same `days` array when nothing changes) ----------

/** Builds a stored activity from validated form values. */
export function createActivity(values, createId) {
  return { id: createId(), ...activityFields(values) };
}

/** Applies validated form values to an existing activity, keeping its id. */
export function applyActivityValues(activity, values) {
  return { ...activity, ...activityFields(values) };
}

function activityFields({ title, time, location, notes, category, url }) {
  return {
    title: title.trim(),
    time: time ? time : null,
    location: (location ?? '').trim(),
    notes: (notes ?? '').trim(),
    category,
    url: normalizeUrl(url ?? ''),
  };
}

/** { day, dayIndex, index } for the activity, or null. */
export function findActivity(days, activityId) {
  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const index = days[dayIndex].activities.findIndex((activity) => activity.id === activityId);
    if (index !== -1) return { day: days[dayIndex], dayIndex, index };
  }
  return null;
}

function mapDay(days, dayId, update) {
  let changed = false;
  const next = days.map((day) => {
    if (day.id !== dayId) return day;
    const updated = update(day);
    if (updated !== day) changed = true;
    return updated;
  });
  return changed ? next : days;
}

export function addActivity(days, dayId, activity) {
  return mapDay(days, dayId, (day) => ({ ...day, activities: [...day.activities, activity] }));
}

export function updateActivity(days, activity) {
  const location = findActivity(days, activity.id);
  if (!location) return days;
  return mapDay(days, location.day.id, (day) => ({
    ...day,
    activities: day.activities.map((item) => (item.id === activity.id ? activity : item)),
  }));
}

export function removeActivity(days, activityId) {
  const location = findActivity(days, activityId);
  if (!location) return days;
  return mapDay(days, location.day.id, (day) => ({
    ...day,
    activities: day.activities.filter((item) => item.id !== activityId),
  }));
}

/**
 * Moves an activity to `toIndex` in day `toDayId` (index counted after removing it from its
 * current place, clamped to the list). Covers both reordering within a day and moving across days.
 */
export function moveActivity(days, activityId, toDayId, toIndex) {
  const from = findActivity(days, activityId);
  if (!from || !days.some((day) => day.id === toDayId)) return days;

  const activity = from.day.activities[from.index];
  const withoutActivity = days.map((day) =>
    day.id === from.day.id
      ? { ...day, activities: day.activities.filter((item) => item.id !== activityId) }
      : day,
  );
  const target = withoutActivity.find((day) => day.id === toDayId);
  const index = Math.max(0, Math.min(toIndex, target.activities.length));
  if (from.day.id === toDayId && index === from.index) return days;

  return withoutActivity.map((day) => {
    if (day.id !== toDayId) return day;
    const activities = [...day.activities];
    activities.splice(index, 0, activity);
    return { ...day, activities };
  });
}

/** Timed activities first, earliest first; untimed ones keep their order at the end. */
export function sortDayByTime(days, dayId) {
  return mapDay(days, dayId, (day) => {
    const sorted = day.activities
      .map((activity, index) => ({ activity, index }))
      .sort((a, b) => {
        if (a.activity.time && b.activity.time) {
          return a.activity.time.localeCompare(b.activity.time) || a.index - b.index;
        }
        if (a.activity.time) return -1;
        if (b.activity.time) return 1;
        return a.index - b.index;
      })
      .map(({ activity }) => activity);
    const unchanged = sorted.every((activity, index) => activity === day.activities[index]);
    return unchanged ? day : { ...day, activities: sorted };
  });
}

export function updateDayNotes(days, dayId, notes) {
  const trimmed = notes.trim();
  return mapDay(days, dayId, (day) => (day.notes === trimmed ? day : { ...day, notes: trimmed }));
}

// ---------- activity form values ----------

export const EMPTY_ACTIVITY_VALUES = {
  title: '',
  category: 'sightseeing',
  time: '',
  location: '',
  url: '',
  notes: '',
};

/** Form values for editing a stored activity. */
export function activityToValues(activity) {
  return {
    title: activity.title,
    category: activity.category,
    time: activity.time ?? '',
    location: activity.location,
    url: activity.url,
    notes: activity.notes,
  };
}

/** "Day 3" for the day at `index` (0-based). */
export const dayLabel = (index) => `Day ${index + 1}`;

/** "Mon, 2 Nov" (locale-dependent). */
export const dayDateLabel = (day) =>
  formatDate(day.date, { weekday: 'short', day: 'numeric', month: 'short' });

export function activityCategoryLabel(value) {
  return ACTIVITY_CATEGORIES.find((option) => option.value === value)?.label ?? 'Other';
}
