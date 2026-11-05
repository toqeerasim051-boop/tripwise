/**
 * Money is stored as integer cents and parsed with string arithmetic, never parseFloat,
 * so 0.1 + 0.2 style rounding errors can't creep into budgets.
 */

const MAX_DECIMALS = 2;
const MAX_WHOLE_DIGITS = 13;

/**
 * Normalises separators: "1,234.56", "1.234,56", "1 234,56", "12,5" and "1,500" are understood.
 * A lone comma followed by exactly three digits groups thousands; otherwise it's a decimal mark.
 */
function normalizeSeparators(input) {
  // Spaces, no-break spaces (U+00A0, U+202F) and apostrophes are thousands separators.
  const value = input.replace(/[\s\u00a0\u202f']/g, '');
  const lastDot = value.lastIndexOf('.');
  const lastComma = value.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    const decimalMark = lastDot > lastComma ? '.' : ',';
    const groupMark = decimalMark === '.' ? ',' : '.';
    return value.split(groupMark).join('').replace(',', '.');
  }
  if (lastComma !== -1) {
    return /^\d{1,3}(,\d{3})+$/.test(value) ? value.split(',').join('') : value.replace(',', '.');
  }
  if (/^\d{1,3}(\.\d{3}){2,}$/.test(value)) return value.split('.').join('');
  return value;
}

/**
 * Parses user input into cents.
 * @returns {{ ok: true, cents: number } | { ok: false, reason: 'empty'|'invalid'|'negative'|'precision'|'too-large' }}
 */
export function parseAmount(input) {
  let text = input;
  if (typeof text === 'number') {
    if (!Number.isFinite(text)) return { ok: false, reason: 'invalid' };
    text = String(text);
  }
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, reason: 'empty' };

  text = text.trim();
  if (text.startsWith('-')) return { ok: false, reason: 'negative' };
  if (text.startsWith('+')) text = text.slice(1);

  const match = /^(\d*)(?:\.(\d*))?$/.exec(normalizeSeparators(text));
  if (!match || (!match[1] && !match[2])) return { ok: false, reason: 'invalid' };

  const [, whole = '', fraction = ''] = match;
  if (fraction.length > MAX_DECIMALS) return { ok: false, reason: 'precision' };
  if (whole.replace(/^0+/, '').length > MAX_WHOLE_DIGITS) return { ok: false, reason: 'too-large' };

  const cents = Number(whole || '0') * 100 + Number(fraction.padEnd(MAX_DECIMALS, '0'));
  return { ok: true, cents };
}

/** Cents for valid input, otherwise null. */
export function toCents(input) {
  const result = parseAmount(input);
  return result.ok ? result.cents : null;
}

/** Plain value for pre-filling an edit form: 123450 -> "1234.50". */
export function centsToInputValue(cents) {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(cents));
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

const formatters = new Map();

function getCurrencyFormatter(currency, locale) {
  const key = `${locale ?? ''}|${currency}`;
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.NumberFormat(locale, { style: 'currency', currency }));
  }
  return formatters.get(key);
}

/** Locale-aware currency display. Falls back to "12.50 XYZ" for codes Intl doesn't know. */
export function formatMoney(cents, currency = 'USD', locale = undefined) {
  try {
    return getCurrencyFormatter(currency, locale).format(cents / 100);
  } catch {
    return `${centsToInputValue(cents)} ${currency}`;
  }
}
