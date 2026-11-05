/**
 * Pure reducer for the trips array. Action creators receive fully-built objects and the current
 * timestamp (see tripModel.js / itinerary.js), so ids and times are generated outside the reducer
 * and it stays deterministic. Any change to a trip sets its `updatedAt` to the action's `now`;
 * actions that change nothing return the same state.
 */
import {
  addActivity,
  moveActivity,
  removeActivity,
  sortDayByTime,
  updateActivity,
  updateDayNotes,
} from './itinerary.js';
import { removeById, replaceById } from './lists.js';
import { mergeTrips } from './tripModel.js';

export const tripActions = {
  create: (trip) => ({ type: 'trip/create', trip }),
  update: (trip) => ({ type: 'trip/update', trip }),
  remove: (id) => ({ type: 'trip/delete', id }),
  /** Replaces everything, e.g. after a change in another tab. */
  replaceAll: (trips) => ({ type: 'trips/replace', trips }),
  /** Merges sanitised trips from a backup file (see mergeTrips). */
  importTrips: (trips) => ({ type: 'trips/import', trips }),

  addActivity: (tripId, dayId, activity, now) => ({
    type: 'activity/add',
    tripId,
    dayId,
    activity,
    now,
  }),
  updateActivity: (tripId, activity, now) => ({ type: 'activity/update', tripId, activity, now }),
  deleteActivity: (tripId, activityId, now) => ({
    type: 'activity/delete',
    tripId,
    activityId,
    now,
  }),
  /** Reorder within a day or move to another day; `toIndex` is counted after removal. */
  moveActivity: (tripId, activityId, toDayId, toIndex, now) => ({
    type: 'activity/move',
    tripId,
    activityId,
    toDayId,
    toIndex,
    now,
  }),
  sortDayByTime: (tripId, dayId, now) => ({ type: 'day/sortByTime', tripId, dayId, now }),
  updateDayNotes: (tripId, dayId, notes, now) => ({
    type: 'day/updateNotes',
    tripId,
    dayId,
    notes,
    now,
  }),

  /** `budget`: { totalCents, currency }. Changing currency relabels amounts; nothing converts. */
  setBudget: (tripId, budget, now) => ({ type: 'budget/set', tripId, budget, now }),
  addExpense: (tripId, expense, now) => ({ type: 'expense/add', tripId, expense, now }),
  updateExpense: (tripId, expense, now) => ({ type: 'expense/update', tripId, expense, now }),
  deleteExpense: (tripId, expenseId, now) => ({
    type: 'expense/delete',
    tripId,
    expenseId,
    now,
  }),

  addSavedLink: (tripId, link, now) => ({ type: 'link/add', tripId, link, now }),
  updateSavedLink: (tripId, link, now) => ({ type: 'link/update', tripId, link, now }),
  deleteSavedLink: (tripId, linkId, now) => ({ type: 'link/delete', tripId, linkId, now }),
};

/** Applies `update(trip)` to one trip; bumps updatedAt only if it returned a new object. */
function updateTripWith(state, tripId, now, update) {
  let changed = false;
  const next = state.map((trip) => {
    if (trip.id !== tripId) return trip;
    const updated = update(trip);
    if (updated === trip) return trip;
    changed = true;
    return { ...updated, updatedAt: now };
  });
  return changed ? next : state;
}

/** updateTripWith for helpers that work on `trip.days`. */
function updateTripDays(state, tripId, now, updateDays) {
  return updateTripWith(state, tripId, now, (trip) => {
    const days = updateDays(trip.days);
    return days === trip.days ? trip : { ...trip, days };
  });
}

/** updateTripWith for helpers that work on one array field (`expenses`, `savedLinks`). */
function updateTripList(state, tripId, now, field, updateList) {
  return updateTripWith(state, tripId, now, (trip) => {
    const list = updateList(trip[field]);
    return list === trip[field] ? trip : { ...trip, [field]: list };
  });
}

const updateTripExpenses = (state, tripId, now, update) =>
  updateTripList(state, tripId, now, 'expenses', update);

function applyBudget(trip, { totalCents, currency }) {
  if (trip.budget.totalCents === totalCents && trip.currency === currency) return trip;
  return { ...trip, budget: { ...trip.budget, totalCents }, currency };
}

export function tripsReducer(state, action) {
  switch (action.type) {
    case 'trip/create':
      if (state.some((trip) => trip.id === action.trip.id)) return state;
      return [...state, action.trip];
    case 'trip/update':
      return state.some((trip) => trip.id === action.trip.id)
        ? state.map((trip) => (trip.id === action.trip.id ? action.trip : trip))
        : state;
    case 'trip/delete':
      return state.some((trip) => trip.id === action.id)
        ? state.filter((trip) => trip.id !== action.id)
        : state;
    case 'trips/replace':
      return action.trips;
    case 'trips/import':
      return mergeTrips(state, action.trips);

    case 'activity/add':
      return updateTripDays(state, action.tripId, action.now, (days) =>
        addActivity(days, action.dayId, action.activity),
      );
    case 'activity/update':
      return updateTripDays(state, action.tripId, action.now, (days) =>
        updateActivity(days, action.activity),
      );
    case 'activity/delete':
      return updateTripDays(state, action.tripId, action.now, (days) =>
        removeActivity(days, action.activityId),
      );
    case 'activity/move':
      return updateTripDays(state, action.tripId, action.now, (days) =>
        moveActivity(days, action.activityId, action.toDayId, action.toIndex),
      );
    case 'day/sortByTime':
      return updateTripDays(state, action.tripId, action.now, (days) =>
        sortDayByTime(days, action.dayId),
      );
    case 'day/updateNotes':
      return updateTripDays(state, action.tripId, action.now, (days) =>
        updateDayNotes(days, action.dayId, action.notes),
      );

    case 'budget/set':
      return updateTripWith(state, action.tripId, action.now, (trip) =>
        applyBudget(trip, action.budget),
      );
    case 'expense/add':
      return updateTripExpenses(state, action.tripId, action.now, (expenses) => [
        ...expenses,
        action.expense,
      ]);
    case 'expense/update':
      return updateTripExpenses(state, action.tripId, action.now, (expenses) =>
        replaceById(expenses, action.expense),
      );
    case 'expense/delete':
      return updateTripExpenses(state, action.tripId, action.now, (expenses) =>
        removeById(expenses, action.expenseId),
      );

    case 'link/add':
      return updateTripList(state, action.tripId, action.now, 'savedLinks', (links) => [
        ...links,
        action.link,
      ]);
    case 'link/update':
      return updateTripList(state, action.tripId, action.now, 'savedLinks', (links) =>
        replaceById(links, action.link),
      );
    case 'link/delete':
      return updateTripList(state, action.tripId, action.now, 'savedLinks', (links) =>
        removeById(links, action.linkId),
      );
    default:
      throw new Error(`Unknown trips action: ${action.type}`);
  }
}
