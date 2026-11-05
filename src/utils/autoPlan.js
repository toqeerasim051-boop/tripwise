/**
 * "Auto-plan my days": spreads a destination's curated attractions over the trip. Pure; the page
 * turns the plan into activities with attractionToActivityValues.
 */
import { dayHasAttraction } from './attractions.js';
import { isWetDay } from './weatherAdvice.js';

/** A day is never filled past this many activities (existing ones included). */
export const MAX_PLANNED_PER_DAY = 3;

const hasCoordinates = (item) => Number.isFinite(item.lat) && Number.isFinite(item.lon);

/** Great-circle distance in km. */
export function distanceKm(a, b) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Orders attractions as a route: start with the first, then always go to the nearest one not yet
 * visited, so neighbours end up next to each other. Ones without coordinates go last.
 */
export function orderByRoute(attractions) {
  const remaining = attractions.filter(hasCoordinates);
  const route = [];
  let current = remaining.shift();
  while (current) {
    route.push(current);
    let nearestIndex = -1;
    remaining.forEach((item, index) => {
      if (
        nearestIndex === -1 ||
        distanceKm(current, item) < distanceKm(current, remaining[nearestIndex])
      ) {
        nearestIndex = index;
      }
    });
    current = nearestIndex === -1 ? undefined : remaining.splice(nearestIndex, 1)[0];
  }
  return [...route, ...attractions.filter((item) => !hasCoordinates(item))];
}

/**
 * Proposes which attractions go on which day.
 * - Attractions already in the trip (same name on any day) are skipped.
 * - Days before `today` (ISO date) are never planned.
 * - Nearby attractions share a day; the route is cut into even groups.
 * - Days are filled in date order, but days forecast to be wet come last.
 * - No day goes over MAX_PLANNED_PER_DAY activities.
 *
 * Returns { entries: [{ day, attractions, wet }] (date order), leftOver: number }.
 */
export function planAttractions(days, attractions, byDate = new Map(), today = '') {
  const pending = attractions.filter(
    (attraction) => !days.some((day) => dayHasAttraction(day, attraction)),
  );
  const route = orderByRoute(pending);
  const open = days
    .map((day, index) => ({
      day,
      index,
      wet: isWetDay(byDate.get(day.date)),
      capacity: Math.max(0, MAX_PLANNED_PER_DAY - day.activities.length),
    }))
    .filter((slot) => slot.capacity > 0 && slot.day.date >= today)
    .sort((a, b) => Number(a.wet) - Number(b.wet) || a.index - b.index);

  const dryCount = open.filter((slot) => !slot.wet).length;
  const perDay = Math.ceil(route.length / Math.max(1, dryCount || open.length));

  const entries = [];
  let next = 0;
  for (const slot of open) {
    if (next >= route.length) break;
    const take = Math.min(slot.capacity, perDay);
    entries.push({ ...slot, attractions: route.slice(next, next + take) });
    next += take;
  }

  return {
    entries: entries
      .sort((a, b) => a.index - b.index)
      .map(({ day, attractions: planned, wet }) => ({ day, attractions: planned, wet })),
    leftOver: route.length - next,
  };
}
