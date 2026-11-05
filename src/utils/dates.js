/**
 * Date-only helpers. Dates are 'YYYY-MM-DD' strings and are handled in UTC internally,
 * so day arithmetic never shifts across time zones or DST changes.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MS_PER_DAY = 86_400_000;

const pad = (value) => String(value).padStart(2, '0');

/** Returns a UTC Date for a real calendar date, or null (rejects e.g. 2025-02-30). */
export function parseIsoDate(value) {
  if (typeof value !== 'string') return null;
  const match = ISO_DATE.exec(value);
  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isSameDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isSameDate ? date : null;
}

export function isValidIsoDate(value) {
  return parseIsoDate(value) !== null;
}

export function toIsoDate(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Today's date in the user's local time zone. */
export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(isoDate, days) {
  const date = parseIsoDate(isoDate);
  return date ? toIsoDate(new Date(date.getTime() + days * MS_PER_DAY)) : null;
}

/** Whole days from `from` to `to` (negative if `to` is earlier); null if either is invalid. */
export function diffInDays(from, to) {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  return start && end ? Math.round((end - start) / MS_PER_DAY) : null;
}

/** Inclusive trip length: same start and end date = 1 day. */
export function tripLengthInDays(startDate, endDate) {
  const diff = diffInDays(startDate, endDate);
  return diff === null || diff < 0 ? null : diff + 1;
}

/** Every date from start to end inclusive; [] if invalid or reversed. Guards against huge ranges. */
export function eachDayInRange(startDate, endDate, { max = 366 } = {}) {
  const length = tripLengthInDays(startDate, endDate);
  if (length === null) return [];
  if (length > max) throw new RangeError(`Date range of ${length} days exceeds ${max}`);
  return Array.from({ length }, (_, index) => addDays(startDate, index));
}

export function isValidTime(value) {
  return typeof value === 'string' && TIME.test(value);
}

/** Locale-aware display of a date-only value, e.g. "Mar 5, 2026". Returns '' for invalid input. */
export function formatDate(isoDate, options = { dateStyle: 'medium' }, locale = undefined) {
  const date = parseIsoDate(isoDate);
  return date ? new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date) : '';
}

/** e.g. "Mar 5 – 12, 2026". Returns '' if either date is invalid. */
export function formatDateRange(
  startDate,
  endDate,
  options = { month: 'short', day: 'numeric', year: 'numeric' },
  locale = undefined,
) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) return '';
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).formatRange(start, end);
}
