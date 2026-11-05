import { useContext } from 'react';
import { TripsContext } from '../context/TripsContext.js';

/**
 * { trips, createTrip, updateTrip, deleteTrip, importTrips(trips),
 *   addActivity(tripId, dayId, values) -> activity, updateActivity(tripId, activity, values),
 *   deleteActivity(tripId, activityId), moveActivity(tripId, activityId, toDayId, toIndex),
 *   sortDayByTime(tripId, dayId), updateDayNotes(tripId, dayId, notes),
 *   setBudget(tripId, { total, currency }), addExpense(tripId, values) -> expense,
 *   updateExpense(tripId, expense, values), deleteExpense(tripId, expenseId),
 *   addSavedLink(tripId, values) -> link, updateSavedLink(tripId, link, values),
 *   deleteSavedLink(tripId, linkId) }
 */
export function useTrips() {
  const value = useContext(TripsContext);
  if (!value) throw new Error('useTrips must be used inside <TripsProvider>');
  return value;
}

/** The trip with `tripId`, or null if it doesn't exist (e.g. deleted in another tab). */
export function useTrip(tripId) {
  const { trips } = useTrips();
  return trips.find((trip) => trip.id === tripId) ?? null;
}
