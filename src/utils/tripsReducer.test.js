// @vitest-environment node
import { tripActions, tripsReducer } from './tripsReducer.js';
import { makeTrip } from '../test/fixtures.js';

describe('tripsReducer', () => {
  const a = makeTrip({ id: 'a' });
  const b = makeTrip({ id: 'b' });

  it('creates trips and ignores duplicate ids', () => {
    expect(tripsReducer([a], tripActions.create(b))).toEqual([a, b]);
    const state = [a];
    expect(tripsReducer(state, tripActions.create(makeTrip({ id: 'a' })))).toBe(state);
  });

  it('replaces an updated trip in place', () => {
    const renamed = { ...b, title: 'Renamed' };
    expect(tripsReducer([a, b], tripActions.update(renamed))).toEqual([a, renamed]);
    const state = [a];
    expect(tripsReducer(state, tripActions.update(renamed))).toBe(state);
  });

  it('deletes trips', () => {
    expect(tripsReducer([a, b], tripActions.remove('a'))).toEqual([b]);
    const state = [a];
    expect(tripsReducer(state, tripActions.remove('zzz'))).toBe(state);
  });

  it('replaces all trips', () => {
    expect(tripsReducer([a], tripActions.replaceAll([b]))).toEqual([b]);
  });

  it('throws on unknown actions', () => {
    expect(() => tripsReducer([], { type: 'nope' })).toThrow(/Unknown trips action/);
  });
});

describe('tripsReducer — itinerary actions', () => {
  const NOW = '2026-11-01T00:00:00.000Z';
  const activity = {
    id: 'act-1',
    title: 'Louvre',
    time: null,
    location: '',
    notes: '',
    category: 'sightseeing',
    url: '',
  };

  function stateWithActivity() {
    const trip = makeTrip({ id: 't' });
    trip.days[0].activities = [activity];
    return [trip, makeTrip({ id: 'other' })];
  }

  it('adds an activity and bumps updatedAt on that trip only', () => {
    const state = [makeTrip({ id: 't' }), makeTrip({ id: 'other' })];
    const next = tripsReducer(state, tripActions.addActivity('t', 't-day-2', activity, NOW));
    expect(next[0].days[1].activities).toEqual([activity]);
    expect(next[0].updatedAt).toBe(NOW);
    expect(next[1]).toBe(state[1]);
  });

  it('updates, moves, sorts, edits notes and deletes', () => {
    let state = stateWithActivity();
    state = tripsReducer(
      state,
      tripActions.updateActivity('t', { ...activity, title: 'Orsay' }, NOW),
    );
    expect(state[0].days[0].activities[0].title).toBe('Orsay');

    state = tripsReducer(state, tripActions.moveActivity('t', 'act-1', 't-day-3', 0, NOW));
    expect(state[0].days[0].activities).toEqual([]);
    expect(state[0].days[2].activities[0].id).toBe('act-1');

    state = tripsReducer(state, tripActions.updateDayNotes('t', 't-day-3', ' Last day ', NOW));
    expect(state[0].days[2].notes).toBe('Last day');

    state = tripsReducer(state, tripActions.deleteActivity('t', 'act-1', NOW));
    expect(state[0].days[2].activities).toEqual([]);
  });

  it('returns the same state (and keeps updatedAt) for no-op actions', () => {
    const state = stateWithActivity();
    expect(tripsReducer(state, tripActions.deleteActivity('t', 'missing', NOW))).toBe(state);
    expect(tripsReducer(state, tripActions.moveActivity('t', 'act-1', 't-day-1', 0, NOW))).toBe(
      state,
    );
    expect(tripsReducer(state, tripActions.sortDayByTime('t', 't-day-1', NOW))).toBe(state);
    expect(tripsReducer(state, tripActions.addActivity('missing', 'd', activity, NOW))).toBe(state);
  });
});

describe('tripsReducer — budget actions', () => {
  const NOW = '2026-11-02T00:00:00.000Z';
  const expense = {
    id: 'e1',
    category: 'food',
    description: 'Lunch',
    amountCents: 1250,
    date: null,
  };

  it('sets the budget and currency, ignoring no-op updates', () => {
    const state = [makeTrip({ id: 't' })];
    const next = tripsReducer(
      state,
      tripActions.setBudget('t', { totalCents: 50000, currency: 'GBP' }, NOW),
    );
    expect(next[0]).toMatchObject({
      budget: { totalCents: 50000 },
      currency: 'GBP',
      updatedAt: NOW,
    });

    expect(
      tripsReducer(
        next,
        tripActions.setBudget('t', { totalCents: 50000, currency: 'GBP' }, 'later'),
      ),
    ).toBe(next);
  });

  it('adds, updates and deletes expenses', () => {
    let state = [makeTrip({ id: 't' })];
    state = tripsReducer(state, tripActions.addExpense('t', expense, NOW));
    expect(state[0].expenses).toEqual([expense]);
    state = tripsReducer(
      state,
      tripActions.updateExpense('t', { ...expense, amountCents: 999 }, NOW),
    );
    expect(state[0].expenses[0].amountCents).toBe(999);
    state = tripsReducer(state, tripActions.deleteExpense('t', 'e1', NOW));
    expect(state[0].expenses).toEqual([]);
    expect(state[0].updatedAt).toBe(NOW);
  });

  it('returns the same state for unknown expenses', () => {
    const state = [makeTrip({ id: 't' })];
    expect(tripsReducer(state, tripActions.deleteExpense('t', 'nope', NOW))).toBe(state);
    expect(tripsReducer(state, tripActions.updateExpense('t', expense, NOW))).toBe(state);
  });
});

describe('tripsReducer — saved link actions', () => {
  const NOW = '2026-11-03T00:00:00.000Z';
  const link = { id: 'l1', type: 'hotel', label: 'Hotel', url: 'https://hotel.example' };

  it('adds, updates and deletes saved links', () => {
    let state = [makeTrip({ id: 't' })];
    state = tripsReducer(state, tripActions.addSavedLink('t', link, NOW));
    expect(state[0]).toMatchObject({ savedLinks: [link], updatedAt: NOW });
    state = tripsReducer(state, tripActions.updateSavedLink('t', { ...link, label: 'Ritz' }, NOW));
    expect(state[0].savedLinks[0].label).toBe('Ritz');
    state = tripsReducer(state, tripActions.deleteSavedLink('t', 'l1', NOW));
    expect(state[0].savedLinks).toEqual([]);
  });

  it('returns the same state for unknown links', () => {
    const state = [makeTrip({ id: 't' })];
    expect(tripsReducer(state, tripActions.deleteSavedLink('t', 'nope', NOW))).toBe(state);
    expect(tripsReducer(state, tripActions.updateSavedLink('t', link, NOW))).toBe(state);
  });
});

describe('tripsReducer — import', () => {
  it('merges imported trips, keeping newer local copies', () => {
    const local = makeTrip({ id: 'a', title: 'Local', updatedAt: '2026-06-01T00:00:00.000Z' });
    const state = [local];
    const next = tripsReducer(
      state,
      tripActions.importTrips([
        makeTrip({ id: 'a', title: 'Stale', updatedAt: '2026-01-01T00:00:00.000Z' }),
        makeTrip({ id: 'b', title: 'Imported' }),
      ]),
    );
    expect(next.map((trip) => trip.title)).toEqual(['Local', 'Imported']);
    expect(tripsReducer(state, tripActions.importTrips([]))).toBe(state);
  });
});
