/** Pure helpers for curated attractions (see services/attractions.js for the data). */
import { LIMITS } from './constants.js';

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Activity form values for adding an attraction to a trip day (validated like any activity). */
export function attractionToActivityValues(attraction) {
  return {
    title: clip(attraction.name, LIMITS.activityTitle),
    category: 'sightseeing',
    time: '',
    location: clip(attraction.place ?? '', LIMITS.activityLocation),
    url: '',
    notes: '',
  };
}

/** True when a day already has an activity with the attraction's name (case-insensitive). */
export function dayHasAttraction(day, attraction) {
  const name = attraction.name.trim().toLowerCase();
  return day.activities.some((activity) => activity.title.trim().toLowerCase() === name);
}

/** "Photo: Jane Doe, CC BY-SA 4.0" */
export function photoCreditText(credit) {
  if (!credit) return '';
  return `Photo: ${credit.artist}, ${credit.license}`;
}
