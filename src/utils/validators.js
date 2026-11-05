/**
 * Pure form validators. Each returns an errors object keyed by field name;
 * an empty object means the values are valid.
 */
import { ACTIVITY_CATEGORIES, EXPENSE_CATEGORIES, LIMITS, LINK_TYPES } from './constants.js';
import { isValidIsoDate, isValidTime, tripLengthInDays } from './dates.js';
import { parseAmount } from './money.js';
import { isSafeUrl, normalizeUrl } from './bookingLinks.js';

const COUNTRY_CODE = /^[A-Z]{3}$/;

const hasValue = (list, value) => list.some((option) => option.value === value);

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

function checkText(value, { label, max, required = false }) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return required ? `${label} is required.` : null;
  if (text.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

const AMOUNT_MESSAGES = {
  empty: 'Enter an amount.',
  invalid: 'Enter a valid amount, for example 125.50.',
  negative: 'Amount cannot be negative.',
  precision: 'Use at most 2 decimal places.',
  'too-large': 'Amount must be 10,000,000 or less.',
};

/** Validates a money input string. Returns a message or null. */
export function checkAmount(value, { allowZero = false } = {}) {
  const result = parseAmount(value);
  if (!result.ok) return AMOUNT_MESSAGES[result.reason];
  if (result.cents > LIMITS.maxAmountCents) return AMOUNT_MESSAGES['too-large'];
  if (!allowZero && result.cents === 0) return 'Amount must be greater than 0.';
  return null;
}

/** Validates a (possibly scheme-less) URL input. Returns a message or null. */
export function checkUrl(value, { required = false } = {}) {
  const url = normalizeUrl(value);
  if (!url) return required ? 'Link is required.' : null;
  if (url.length > LIMITS.urlLength) return `Link must be ${LIMITS.urlLength} characters or fewer.`;
  if (!isSafeUrl(url)) return 'Enter a valid web address starting with http:// or https://.';
  return null;
}

function addError(errors, field, message) {
  if (message) errors[field] = message;
}

export function validateTrip({ title, countryCode, startDate, endDate } = {}) {
  const errors = {};
  addError(
    errors,
    'title',
    checkText(title, { label: 'Trip name', max: LIMITS.tripTitle, required: true }),
  );

  if (!countryCode) errors.countryCode = 'Choose a destination.';
  else if (!COUNTRY_CODE.test(countryCode))
    errors.countryCode = 'Choose a destination from the list.';

  if (!startDate) errors.startDate = 'Start date is required.';
  else if (!isValidIsoDate(startDate)) errors.startDate = 'Enter a valid start date.';

  if (!endDate) errors.endDate = 'End date is required.';
  else if (!isValidIsoDate(endDate)) errors.endDate = 'Enter a valid end date.';

  if (!errors.startDate && !errors.endDate) {
    const length = tripLengthInDays(startDate, endDate);
    if (length === null) errors.endDate = 'End date must be on or after the start date.';
    else if (length > LIMITS.tripMaxDays) {
      errors.endDate = `Trips can be at most ${LIMITS.tripMaxDays} days long.`;
    }
  }
  return errors;
}

/** `currency` is optional here; when given it must be an ISO 4217 code. */
export function validateBudget({ total, currency } = {}) {
  const errors = {};
  addError(errors, 'total', checkAmount(total, { allowZero: true }));
  if (currency !== undefined && !/^[A-Z]{3}$/.test(currency)) {
    errors.currency = 'Choose a currency.';
  }
  return errors;
}

export function validateDay({ notes } = {}) {
  const errors = {};
  addError(errors, 'notes', checkText(notes, { label: 'Notes', max: LIMITS.dayNotes }));
  return errors;
}

export function validateActivity({ title, time, location, notes, url, category } = {}) {
  const errors = {};
  addError(
    errors,
    'title',
    checkText(title, { label: 'Title', max: LIMITS.activityTitle, required: true }),
  );
  if (time && !isValidTime(time)) errors.time = 'Enter a valid time (HH:MM).';
  addError(
    errors,
    'location',
    checkText(location, { label: 'Location', max: LIMITS.activityLocation }),
  );
  addError(errors, 'notes', checkText(notes, { label: 'Notes', max: LIMITS.activityNotes }));
  addError(errors, 'url', checkUrl(url));
  if (!hasValue(ACTIVITY_CATEGORIES, category)) errors.category = 'Choose a category.';
  return errors;
}

export function validateExpense({ description, amount, category, date } = {}) {
  const errors = {};
  addError(
    errors,
    'description',
    checkText(description, { label: 'Description', max: LIMITS.expenseDescription }),
  );
  addError(errors, 'amount', checkAmount(amount));
  if (!hasValue(EXPENSE_CATEGORIES, category)) errors.category = 'Choose a category.';
  if (date && !isValidIsoDate(date)) errors.date = 'Enter a valid date.';
  return errors;
}

export function validateSavedLink({ type, label, url } = {}) {
  const errors = {};
  if (!hasValue(LINK_TYPES, type)) errors.type = 'Choose a link type.';
  addError(
    errors,
    'label',
    checkText(label, { label: 'Label', max: LIMITS.linkLabel, required: true }),
  );
  addError(errors, 'url', checkUrl(url, { required: true }));
  return errors;
}

const SEARCH_TEXT_MAX = 100;
const MAX_GUESTS = 30;

function checkGuests(value, noun) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > MAX_GUESTS) {
    return `Enter 1 to ${MAX_GUESTS} ${noun}.`;
  }
  return undefined;
}

/**
 * Booking search form (BookingSearchForm). `type` is 'hotel' | 'flight' | 'activity'; dates are
 * optional but must be today or later, and the second date must come after the first.
 */
export function validateBookingSearch(type, values, today) {
  const errors = {};
  const where = values.where.trim();
  if (!where)
    errors.where =
      type === 'flight' ? 'Enter where you are flying to.' : 'Enter a city or country.';
  else if (where.length > SEARCH_TEXT_MAX)
    errors.where = `Use at most ${SEARCH_TEXT_MAX} characters.`;
  if (type === 'activity') return errors;

  if (type === 'flight' && values.from.trim().length > SEARCH_TEXT_MAX) {
    errors.from = `Use at most ${SEARCH_TEXT_MAX} characters.`;
  }
  const [first, second] = type === 'hotel' ? ['check-in', 'check-out'] : ['departure', 'return'];
  const { checkIn, checkOut } = values;
  for (const [field, value] of [
    ['checkIn', checkIn],
    ['checkOut', checkOut],
  ]) {
    if (value && !isValidIsoDate(value)) errors[field] = 'Enter a valid date.';
    else if (value && value < today) errors[field] = 'Pick today or a later date.';
  }
  if (!errors.checkIn && !errors.checkOut) {
    if (checkOut && !checkIn)
      errors.checkIn = `Add a ${first} date too, or clear the ${second} date.`;
    else if (type === 'hotel' && checkIn && !checkOut)
      errors.checkOut = 'Add a check-out date too.';
    else if (type === 'hotel' && checkIn && checkOut <= checkIn) {
      errors.checkOut = 'Check-out must be after check-in.';
    } else if (checkIn && checkOut && checkOut < checkIn) {
      errors.checkOut = "Return can't be before departure.";
    }
  }
  if (type === 'hotel') {
    const adults = checkGuests(values.adults, 'adults');
    const rooms = checkGuests(values.rooms, 'rooms');
    if (adults) errors.adults = adults;
    if (rooms) errors.rooms = rooms;
    else if (!adults && Number(values.rooms) > Number(values.adults)) {
      errors.rooms = "Rooms can't be more than adults.";
    }
  }
  return errors;
}
