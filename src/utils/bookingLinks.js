/**
 * External link helpers. TripWise never books or takes payment: it only builds search links that
 * open provider sites. These are public search URLs, not official APIs, so their formats can
 * change; each provider has one builder below to make swapping or fixing it a one-line change.
 * Every user-entered URL must pass isSafeUrl when saved AND when rendered.
 */
import { addDays } from './dates.js';

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;

/** True only for absolute http(s) URLs with a host; rejects javascript:, data:, etc. */
export function isSafeUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return SAFE_PROTOCOLS.has(url.protocol) && url.hostname !== '';
  } catch {
    return false;
  }
}

/** Trims input and adds "https://" when the user typed a bare host like "booking.com/abc". */
export function normalizeUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (trimmed === '' || HAS_SCHEME.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/** "www.booking.com/x" -> "booking.com", for compact display. */
export function displayHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ---------- provider search links ----------

function withParams(base, params) {
  const url = new URL(base);
  Object.entries(params).forEach(([name, value]) => {
    if (value) url.searchParams.set(name, value);
  });
  return url.toString();
}

/**
 * One builder per provider: (search values) -> URL. Values are the BookingSearchForm fields
 * ({ where, from, checkIn, checkOut, adults, rooms }); empty ones are left out.
 */
export const SEARCH_PROVIDERS = [
  {
    type: 'hotel',
    title: 'Hotels',
    provider: 'Booking.com',
    build: ({ where, checkIn, checkOut, adults, rooms }) =>
      withParams('https://www.booking.com/searchresults.html', {
        ss: where,
        checkin: checkIn,
        checkout: checkOut,
        group_adults: adults,
        no_rooms: rooms,
      }),
  },
  {
    type: 'flight',
    title: 'Flights',
    provider: 'Google Flights',
    build: ({ from, where, checkIn, checkOut }) => {
      const route = from ? `Flights from ${from} to ${where}` : `Flights to ${where}`;
      const dates = checkIn && (checkOut ? ` on ${checkIn} through ${checkOut}` : ` on ${checkIn}`);
      return withParams('https://www.google.com/travel/flights', { q: route + (dates || '') });
    },
  },
  {
    type: 'activity',
    title: 'Activities',
    provider: 'GetYourGuide',
    build: ({ where }) => withParams('https://www.getyourguide.com/s/', { q: where }),
  },
];

export const getSearchProvider = (type) =>
  SEARCH_PROVIDERS.find((provider) => provider.type === type);

/**
 * Dates to search with. They are only included for trips that haven't started yet, since
 * providers reject past dates. Hotels need at least one night, so a same-day trip checks out the
 * next day. -> { includesDates, checkIn, checkOut } (dates null when not included)
 */
export function getSearchDates(trip, today) {
  if (trip.startDate < today) return { includesDates: false, checkIn: null, checkOut: null };
  return {
    includesDates: true,
    checkIn: trip.startDate,
    checkOut: trip.endDate > trip.startDate ? trip.endDate : addDays(trip.startDate, 1),
  };
}

/** Starting values for the search form, filled in from the trip (all strings, as in inputs). */
export function getSearchDefaults(trip, today) {
  const { checkIn, checkOut } = getSearchDates(trip, today);
  return {
    where: trip.destinationName,
    from: '',
    checkIn: checkIn ?? '',
    checkOut: checkOut ?? '',
    adults: '2',
    rooms: '1',
  };
}

/** Provider URL for one search type ('hotel' | 'flight' | 'activity') from the form values. */
export function buildSearchUrl(type, values) {
  const trimmed = Object.fromEntries(
    Object.entries(values).map(([name, value]) => [name, String(value ?? '').trim()]),
  );
  return getSearchProvider(type).build(trimmed);
}
