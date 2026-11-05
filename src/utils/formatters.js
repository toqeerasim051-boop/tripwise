/** Display formatters. All return '—' for missing values so the UI never shows "null" or "NaN". */

const EMPTY = '—';

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export function formatNumber(value, locale = undefined) {
  return isNumber(value) ? new Intl.NumberFormat(locale).format(value) : EMPTY;
}

/** e.g. 67_400_000 -> "67.4M" */
export function formatCompactNumber(value, locale = undefined) {
  return isNumber(value)
    ? new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    : EMPTY;
}

export function formatTemperature(value, unit = '°C') {
  return isNumber(value) ? `${Math.round(value)}${unit}` : EMPTY;
}

export function formatPercent(value) {
  return isNumber(value) ? `${Math.round(value)}%` : EMPTY;
}

/** e.g. ['French', 'German'] -> "French and German" */
export function formatList(items, locale = undefined) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (values.length === 0) return EMPTY;
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(values);
}

/** ISO timestamp -> the user's local date, e.g. "Oct 27, 2026". */
export function formatTimestamp(value, locale = undefined) {
  const time = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isNaN(time)
    ? EMPTY
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(time);
}

/** e.g. (1, 'day') -> "1 day", (3, 'day') -> "3 days" */
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "3 hours ago", "yesterday", "5 minutes ago" for a ms timestamp (locale-dependent). */
export function formatTimeAgo(timestamp, now = Date.now(), locale = undefined) {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000));
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (minutes < 60) return format.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format.format(-hours, 'hour');
  return format.format(-Math.round(hours / 24), 'day');
}
