/**
 * Optional partner search widgets (e.g. from Travelpayouts) shown on the Bookings tab, so users
 * can search hotels, flights and activities without leaving TripWise. Booking and payment still
 * happen on the partner's site.
 *
 * The site owner copies each widget's script URL from the partner dashboard into .env
 * (VITE_PARTNER_WIDGET_HOTEL / _FLIGHT / _ACTIVITY). These URLs carry a public affiliate id, not a
 * secret. Optional placeholders are filled per trip: {query} (the "Search near" text),
 * {checkin} and {checkout} (YYYY-MM-DD, empty once the trip has started) and {currency}.
 *
 * Partner code is untrusted, so it runs in a sandboxed iframe without allow-same-origin: it gets an
 * opaque origin and can't read TripWise's localStorage or DOM. It reports its height (and script
 * load failures) to the page with postMessage.
 */
import { getSearchDates } from './bookingLinks.js';

export const PARTNER_WIDGETS = [
  { type: 'hotel', title: 'Hotels', envKey: 'VITE_PARTNER_WIDGET_HOTEL' },
  { type: 'flight', title: 'Flights', envKey: 'VITE_PARTNER_WIDGET_FLIGHT' },
  { type: 'activity', title: 'Activities', envKey: 'VITE_PARTNER_WIDGET_ACTIVITY' },
];

export const WIDGET_MESSAGE_SOURCE = 'tripwise-partner-widget';

export const WIDGET_SANDBOX =
  'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox';

const PLACEHOLDER = /\{(query|checkin|checkout|currency)\}/g;

function isHttpsTemplate(template) {
  try {
    return new URL(template.replace(PLACEHOLDER, '')).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Widgets that have a valid (https) script URL configured, in PARTNER_WIDGETS order. */
export function getPartnerWidgets(env = import.meta.env) {
  return PARTNER_WIDGETS.flatMap(({ type, title, envKey }) => {
    const template = typeof env[envKey] === 'string' ? env[envKey].trim() : '';
    if (!template) return [];
    if (!isHttpsTemplate(template)) {
      console.warn(`${envKey} is ignored: it must be an https:// script URL`);
      return [];
    }
    return [{ type, title, template }];
  });
}

/** Placeholder values for a trip. */
export function widgetValuesFor(trip, { query, today }) {
  const { checkIn, checkOut } = getSearchDates(trip, today);
  return {
    query: query?.trim() || trip.destinationName,
    checkin: checkIn ?? '',
    checkout: checkOut ?? '',
    currency: trip.currency,
  };
}

/** Replaces known placeholders with URL-encoded values. */
export function fillWidgetUrl(template, values) {
  return template.replace(PLACEHOLDER, (match, name) => encodeURIComponent(values[name] ?? ''));
}

function escapeAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Runs inside the iframe: reports the content height (batched per frame) and load/error events.
const REPORTER = `
var SOURCE = ${JSON.stringify(WIDGET_MESSAGE_SOURCE)};
function tripwiseReport(type, extra) {
  parent.postMessage(Object.assign({ source: SOURCE, type: type }, extra), '*');
}
var heightQueued = false;
function reportHeight() {
  if (heightQueued) return;
  heightQueued = true;
  requestAnimationFrame(function () {
    heightQueued = false;
    tripwiseReport('height', { height: Math.ceil(document.body.scrollHeight) });
  });
}
new ResizeObserver(reportHeight).observe(document.body);
new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true, attributes: true });
window.addEventListener('load', function () {
  tripwiseReport('loaded');
  reportHeight();
});
`;

/** The iframe's srcdoc: the partner script at the place where it renders its widget. */
export function buildWidgetDocument(src) {
  return [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    // Partner widgets are designed for light pages.
    '<meta name="color-scheme" content="light">',
    '<style>html,body{margin:0;padding:0}body{font-family:system-ui,sans-serif}</style>',
    `</head><body><script>${REPORTER}</script>`,
    `<script async charset="utf-8" src="${escapeAttribute(src)}" onerror="tripwiseReport('error')"></script>`,
    '</body></html>',
  ].join('');
}
