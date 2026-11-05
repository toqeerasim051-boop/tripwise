/**
 * Weather-aware itinerary advice. Pure; forecast days come from services/openMeteo.js and are
 * local to the destination, like trip dates.
 */
import { diffInDays } from './dates.js';
import { getWeatherInfo } from './weatherCodes.js';

/** Rain chance (%) from which a day counts as wet, whatever its weather code. */
export const WET_PROBABILITY = 60;

const WET_ICONS = new Set(['rain', 'freezing-rain', 'snow', 'thunderstorm']);

/** Activity categories that usually happen outside. */
const OUTDOOR_CATEGORIES = new Set(['sightseeing', 'event']);

export const isOutdoor = (activity) => OUTDOOR_CATEGORIES.has(activity.category);

/** True for rain, snow or storms, or a high chance of rain. Unknown weather is never wet. */
export function isWetDay(forecastDay) {
  if (!forecastDay) return false;
  return (
    WET_ICONS.has(getWeatherInfo(forecastDay.weatherCode).icon) ||
    (forecastDay.precipitationProbability ?? 0) >= WET_PROBABILITY
  );
}

/** Map of ISO date -> forecast day (empty without a forecast). */
export function forecastByDate(forecast) {
  return new Map((forecast?.daily ?? []).map((day) => [day.date, day]));
}

/**
 * The best other day for outdoor plans: forecast to be dry, fewest activities, then the closest
 * date. Null when no day in the forecast window is dry.
 */
export function findDryDay(days, byDate, fromDay) {
  const candidates = days.filter(
    (day) => day.id !== fromDay.id && byDate.has(day.date) && !isWetDay(byDate.get(day.date)),
  );
  const distance = (day) => Math.abs(diffInDays(fromDay.date, day.date));
  candidates.sort((a, b) => a.activities.length - b.activities.length || distance(a) - distance(b));
  return candidates[0] ?? null;
}

/**
 * Wet trip days that have outdoor plans: Map dayId -> { forecast, activities, dryDayId }.
 * `activities` are the outdoor ones; `dryDayId` is where to move them (or null).
 */
export function getWeatherWarnings(days, byDate) {
  const warnings = new Map();
  days.forEach((day) => {
    const forecast = byDate.get(day.date);
    if (!isWetDay(forecast)) return;
    const activities = day.activities.filter(isOutdoor);
    if (activities.length === 0) return;
    warnings.set(day.id, {
      forecast,
      activities,
      dryDayId: findDryDay(days, byDate, day)?.id ?? null,
    });
  });
  return warnings;
}
