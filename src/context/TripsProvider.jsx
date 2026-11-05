import { useMemo } from 'react';
import { TripsContext } from './TripsContext.js';
import { usePersistentReducer } from '../hooks/usePersistentReducer.js';
import { STORAGE_KEYS } from '../utils/storage.js';
import { sanitizeTrips } from '../utils/tripModel.js';
import { tripActions, tripsReducer } from '../utils/tripsReducer.js';
import { applyActivityValues, createActivity } from '../utils/itinerary.js';
import { createId } from '../utils/ids.js';
import { applyExpenseValues, createExpense } from '../utils/budget.js';
import { toCents } from '../utils/money.js';
import { applySavedLinkValues, createSavedLink } from '../utils/savedLinks.js';

const PERSISTENCE = { sanitize: sanitizeTrips, replaceAction: tripActions.replaceAll };

const now = () => new Date().toISOString();

export default function TripsProvider({ children }) {
  const [trips, dispatch] = usePersistentReducer(STORAGE_KEYS.trips, tripsReducer, PERSISTENCE);

  // Stable operations (dispatch never changes), so they live in their own memo.
  const operations = useMemo(
    () => ({
      createTrip: (trip) => dispatch(tripActions.create(trip)),
      updateTrip: (trip) => dispatch(tripActions.update(trip)),
      deleteTrip: (id) => dispatch(tripActions.remove(id)),
      /** Merges sanitised trips from a backup file. */
      importTrips: (imported) => dispatch(tripActions.importTrips(imported)),

      /** Returns the created activity. `values` must already be validated. */
      addActivity: (tripId, dayId, values) => {
        const activity = createActivity(values, createId);
        dispatch(tripActions.addActivity(tripId, dayId, activity, now()));
        return activity;
      },
      updateActivity: (tripId, activity, values) =>
        dispatch(tripActions.updateActivity(tripId, applyActivityValues(activity, values), now())),
      deleteActivity: (tripId, activityId) =>
        dispatch(tripActions.deleteActivity(tripId, activityId, now())),
      moveActivity: (tripId, activityId, toDayId, toIndex) =>
        dispatch(tripActions.moveActivity(tripId, activityId, toDayId, toIndex, now())),
      sortDayByTime: (tripId, dayId) => dispatch(tripActions.sortDayByTime(tripId, dayId, now())),
      updateDayNotes: (tripId, dayId, notes) =>
        dispatch(tripActions.updateDayNotes(tripId, dayId, notes, now())),

      /** `values`: { total (validated amount string), currency }. */
      setBudget: (tripId, { total, currency }) =>
        dispatch(tripActions.setBudget(tripId, { totalCents: toCents(total), currency }, now())),
      /** Returns the created expense. `values` must already be validated. */
      addExpense: (tripId, values) => {
        const expense = createExpense(values, createId);
        dispatch(tripActions.addExpense(tripId, expense, now()));
        return expense;
      },
      updateExpense: (tripId, expense, values) =>
        dispatch(tripActions.updateExpense(tripId, applyExpenseValues(expense, values), now())),
      deleteExpense: (tripId, expenseId) =>
        dispatch(tripActions.deleteExpense(tripId, expenseId, now())),

      /** Returns the created link. `values` must already be validated. */
      addSavedLink: (tripId, values) => {
        const link = createSavedLink(values, createId);
        dispatch(tripActions.addSavedLink(tripId, link, now()));
        return link;
      },
      updateSavedLink: (tripId, link, values) =>
        dispatch(tripActions.updateSavedLink(tripId, applySavedLinkValues(link, values), now())),
      deleteSavedLink: (tripId, linkId) =>
        dispatch(tripActions.deleteSavedLink(tripId, linkId, now())),
    }),
    [dispatch],
  );

  const value = useMemo(() => ({ trips, ...operations }), [trips, operations]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}
