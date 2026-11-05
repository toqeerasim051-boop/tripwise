/**
 * Trip creation, updates and load-time sanitising. All functions are pure: ids and timestamps
 * are injected so they can be tested deterministically.
 */
import { ACTIVITY_CATEGORIES, EXPENSE_CATEGORIES, LINK_TYPES } from './constants.js';
import { isValidIsoDate, isValidTime, tripLengthInDays } from './dates.js';
import { isSafeUrl } from './bookingLinks.js';
import { MAX_STORED_TRIP_DAYS, buildDays, reconcileDays } from './itinerary.js';
import { createId as defaultCreateId } from './ids.js';

const COUNTRY_CODE = /^[A-Z]{3}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;
export const FALLBACK_CURRENCY = 'USD';

/** Snapshot of the destination stored on the trip, so trip pages never need REST Countries. */
export function destinationFromCountry(country) {
  return {
    countryCode: country.code,
    destinationName: country.name,
    lat: country.lat ?? null,
    lon: country.lon ?? null,
    flagUrl: country.flagUrl ?? null,
  };
}

export function defaultCurrencyFor(country) {
  return country?.currencies?.[0]?.code ?? FALLBACK_CURRENCY;
}

/** `values`: { title, startDate, endDate } (already validated). `destination`: a country summary. */
export function createTrip({ values, destination, now, createId = defaultCreateId }) {
  return {
    id: createId(),
    title: values.title.trim(),
    ...destinationFromCountry(destination),
    startDate: values.startDate,
    endDate: values.endDate,
    currency: defaultCurrencyFor(destination),
    budget: { totalCents: 0 },
    days: buildDays(values.startDate, values.endDate, createId),
    expenses: [],
    savedLinks: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Applies edited details. `destination` is a country summary when the destination changed,
 * otherwise null. Currency is deliberately kept: existing expenses are in that currency.
 */
export function updateTripDetails(trip, { values, destination, now, createId = defaultCreateId }) {
  return {
    ...trip,
    title: values.title.trim(),
    ...(destination ? destinationFromCountry(destination) : {}),
    startDate: values.startDate,
    endDate: values.endDate,
    days: reconcileDays(trip.days, values.startDate, values.endDate, createId),
    updatedAt: now,
  };
}

/** 'upcoming' | 'ongoing' | 'past', relative to `today` ('YYYY-MM-DD', user's local date). */
export function getTripStatus(trip, today) {
  if (today < trip.startDate) return 'upcoming';
  if (today > trip.endDate) return 'past';
  return 'ongoing';
}

export function sortTripsByUpdated(trips) {
  return [...trips].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Adds imported trips (already sanitised). A trip whose id already exists replaces the current
 * one only if it was updated more recently, so importing an old backup never loses newer edits.
 * Returns `current` itself when nothing changes.
 */
export function mergeTrips(current, incoming) {
  const byId = new Map(current.map((trip) => [trip.id, trip]));
  let changed = false;
  for (const trip of incoming) {
    const existing = byId.get(trip.id);
    if (!existing || Date.parse(trip.updatedAt) > Date.parse(existing.updatedAt)) {
      byId.set(trip.id, trip);
      changed = true;
    }
  }
  return changed ? [...byId.values()] : current;
}

export function countActivities(trip) {
  return trip.days.reduce((total, day) => total + day.activities.length, 0);
}

// ---------- load-time sanitising ----------

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';
const asString = (value) => (typeof value === 'string' ? value : '');
const asNumberOrNull = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const isTimestamp = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isCents = (value) => Number.isSafeInteger(value) && value >= 0;
const hasOption = (options, value) => options.some((option) => option.value === value);

function sanitizeList(items, sanitizeItem) {
  if (!Array.isArray(items)) return { items: [], dropped: 0 };
  const result = [];
  let dropped = 0;
  for (const item of items) {
    const clean = item && typeof item === 'object' ? sanitizeItem(item) : null;
    if (clean) result.push(clean);
    else dropped += 1;
  }
  return { items: result, dropped };
}

function sanitizeActivity(activity) {
  if (!isNonEmptyString(activity.id) || !isNonEmptyString(activity.title)) return null;
  return {
    id: activity.id,
    title: activity.title,
    time: isValidTime(activity.time) ? activity.time : null,
    location: asString(activity.location),
    notes: asString(activity.notes),
    category: hasOption(ACTIVITY_CATEGORIES, activity.category) ? activity.category : 'other',
    url: isSafeUrl(activity.url) ? activity.url : '',
  };
}

function sanitizeExpense(expense) {
  if (!isNonEmptyString(expense.id) || !isCents(expense.amountCents)) return null;
  return {
    id: expense.id,
    category: hasOption(EXPENSE_CATEGORIES, expense.category) ? expense.category : 'other',
    description: asString(expense.description),
    amountCents: expense.amountCents,
    date: isValidIsoDate(expense.date) ? expense.date : null,
  };
}

function sanitizeSavedLink(link) {
  if (!isNonEmptyString(link.id) || !isNonEmptyString(link.label) || !isSafeUrl(link.url)) {
    return null;
  }
  return {
    id: link.id,
    type: hasOption(LINK_TYPES, link.type) ? link.type : 'other',
    label: link.label,
    url: link.url,
  };
}

/**
 * Validates one stored trip. Returns null only when core fields are unusable (no id, title,
 * destination or valid date range); invalid child items are dropped individually.
 */
function sanitizeTrip(raw, { now, createId }) {
  const length = tripLengthInDays(raw.startDate, raw.endDate);
  const isUsable =
    isNonEmptyString(raw.id) &&
    isNonEmptyString(raw.title) &&
    typeof raw.countryCode === 'string' &&
    COUNTRY_CODE.test(raw.countryCode) &&
    isNonEmptyString(raw.destinationName) &&
    length !== null &&
    length <= MAX_STORED_TRIP_DAYS;
  if (!isUsable) return { trip: null, dropped: 0 };

  let dropped = 0;
  const days = sanitizeList(raw.days, (day) => {
    if (!isNonEmptyString(day.id) || !isValidIsoDate(day.date)) return null;
    const activities = sanitizeList(day.activities, sanitizeActivity);
    dropped += activities.dropped;
    return { id: day.id, date: day.date, notes: asString(day.notes), activities: activities.items };
  });
  const expenses = sanitizeList(raw.expenses, sanitizeExpense);
  const savedLinks = sanitizeList(raw.savedLinks, sanitizeSavedLink);
  dropped += days.dropped + expenses.dropped + savedLinks.dropped;

  // Duplicate dates: keep the first; then guarantee exactly one day per date in range.
  const uniqueDays = [...new Map(days.items.reverse().map((day) => [day.date, day])).values()];
  const createdAt = isTimestamp(raw.createdAt) ? raw.createdAt : now;

  return {
    dropped,
    trip: {
      id: raw.id,
      title: raw.title,
      countryCode: raw.countryCode,
      destinationName: raw.destinationName,
      lat: asNumberOrNull(raw.lat),
      lon: asNumberOrNull(raw.lon),
      flagUrl: isSafeUrl(raw.flagUrl) ? raw.flagUrl : null,
      startDate: raw.startDate,
      endDate: raw.endDate,
      currency:
        typeof raw.currency === 'string' && CURRENCY_CODE.test(raw.currency)
          ? raw.currency
          : FALLBACK_CURRENCY,
      budget: { totalCents: isCents(raw.budget?.totalCents) ? raw.budget.totalCents : 0 },
      days: reconcileDays(uniqueDays, raw.startDate, raw.endDate, createId),
      expenses: expenses.items,
      savedLinks: savedLinks.items,
      createdAt,
      updatedAt: isTimestamp(raw.updatedAt) ? raw.updatedAt : createdAt,
    },
  };
}

/** Sanitises the stored trips array. Duplicate trip ids keep the first occurrence. */
export function sanitizeTrips(
  data,
  { now = new Date().toISOString(), createId = defaultCreateId } = {},
) {
  if (!Array.isArray(data)) return [];

  const trips = [];
  const ids = new Set();
  let droppedTrips = 0;
  let droppedItems = 0;
  for (const raw of data) {
    const { trip, dropped } =
      raw && typeof raw === 'object'
        ? sanitizeTrip(raw, { now, createId })
        : { trip: null, dropped: 0 };
    droppedItems += dropped;
    if (trip && !ids.has(trip.id)) {
      ids.add(trip.id);
      trips.push(trip);
    } else {
      droppedTrips += 1;
    }
  }
  if (droppedTrips || droppedItems) {
    console.warn(`trips: dropped ${droppedTrips} invalid trips and ${droppedItems} invalid items`);
  }
  return trips;
}
