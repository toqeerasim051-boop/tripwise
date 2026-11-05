// @vitest-environment node
import {
  countActivities,
  createTrip,
  getTripStatus,
  mergeTrips,
  sanitizeTrips,
  sortTripsByUpdated,
  updateTripDetails,
} from './tripModel.js';
import { france, japan, makeTrip } from '../test/fixtures.js';

const NOW = '2026-10-27T12:00:00.000Z';
const LATER = '2026-10-28T09:00:00.000Z';

function idFactory(prefix = 'id') {
  let next = 0;
  return () => `${prefix}-${(next += 1)}`;
}

describe('createTrip', () => {
  it('builds a complete trip with a destination snapshot and one day per date', () => {
    const trip = createTrip({
      values: { title: '  Paris getaway ', startDate: '2026-05-01', endDate: '2026-05-02' },
      destination: france,
      now: NOW,
      createId: idFactory(),
    });

    expect(trip).toEqual({
      id: 'id-1',
      title: 'Paris getaway',
      countryCode: 'FRA',
      destinationName: 'France',
      lat: 48.87,
      lon: 2.33,
      flagUrl: france.flagUrl,
      startDate: '2026-05-01',
      endDate: '2026-05-02',
      currency: 'EUR',
      budget: { totalCents: 0 },
      days: [
        { id: 'id-2', date: '2026-05-01', notes: '', activities: [] },
        { id: 'id-3', date: '2026-05-02', notes: '', activities: [] },
      ],
      expenses: [],
      savedLinks: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('falls back to USD when the destination has no currency', () => {
    const trip = createTrip({
      values: { title: 'Tokyo', startDate: '2026-05-01', endDate: '2026-05-01' },
      destination: japan, // fixture has no currencies
      now: NOW,
      createId: idFactory(),
    });
    expect(trip.currency).toBe('USD');
  });
});

describe('updateTripDetails', () => {
  const trip = makeTrip({
    days: [
      { id: 'd1', date: '2026-05-01', notes: '', activities: [] },
      { id: 'd2', date: '2026-05-02', notes: 'Keep me', activities: [] },
      { id: 'd3', date: '2026-05-03', notes: '', activities: [] },
    ],
  });

  it('updates details, reconciles days and bumps updatedAt, keeping currency', () => {
    const updated = updateTripDetails(trip, {
      values: { title: 'Tokyo trip', startDate: '2026-05-02', endDate: '2026-05-04' },
      destination: japan,
      now: LATER,
      createId: idFactory('new'),
    });

    expect(updated).toMatchObject({
      id: trip.id,
      title: 'Tokyo trip',
      countryCode: 'JPN',
      destinationName: 'Japan',
      lat: 35.68,
      currency: 'EUR',
      createdAt: trip.createdAt,
      updatedAt: LATER,
    });
    expect(updated.days.map((day) => day.id)).toEqual(['d2', 'd3', 'new-1']);
    expect(updated.days[0].notes).toBe('Keep me');
    expect(trip.title).toBe('Paris getaway'); // not mutated
  });

  it('keeps the destination snapshot when destination is null', () => {
    const updated = updateTripDetails(trip, {
      values: { title: 'Renamed', startDate: trip.startDate, endDate: trip.endDate },
      destination: null,
      now: LATER,
    });
    expect(updated).toMatchObject({ countryCode: 'FRA', destinationName: 'France' });
    expect(updated.days).toEqual(trip.days);
  });
});

describe('getTripStatus', () => {
  const trip = makeTrip({ startDate: '2026-05-01', endDate: '2026-05-03' });
  it.each([
    ['2026-04-30', 'upcoming'],
    ['2026-05-01', 'ongoing'],
    ['2026-05-03', 'ongoing'],
    ['2026-05-04', 'past'],
  ])('on %s is %s', (today, status) => {
    expect(getTripStatus(trip, today)).toBe(status);
  });
});

describe('sortTripsByUpdated / countActivities', () => {
  it('sorts most recently updated first without mutating', () => {
    const a = makeTrip({ id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' });
    const b = makeTrip({ id: 'b', updatedAt: '2026-03-01T00:00:00.000Z' });
    const input = [a, b];
    expect(sortTripsByUpdated(input).map((t) => t.id)).toEqual(['b', 'a']);
    expect(input[0]).toBe(a);
  });

  it('counts activities across days', () => {
    const trip = makeTrip();
    trip.days[0].activities = [{ id: 'x' }, { id: 'y' }];
    trip.days[2].activities = [{ id: 'z' }];
    expect(countActivities(trip)).toBe(3);
  });
});

describe('sanitizeTrips', () => {
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
  const options = { now: NOW, createId: idFactory('fix') };

  it('passes valid trips through unchanged', () => {
    const trip = makeTrip();
    expect(sanitizeTrips([trip], options)).toEqual([trip]);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('drops unusable trips and duplicate ids, keeping the rest', () => {
    const result = sanitizeTrips(
      [
        makeTrip({ id: 'ok' }),
        makeTrip({ id: 'ok', title: 'Duplicate' }),
        makeTrip({ id: '' }),
        makeTrip({ id: 'no-title', title: '  ' }),
        makeTrip({ id: 'bad-country', countryCode: 'fr' }),
        makeTrip({ id: 'reversed', startDate: '2026-05-05', endDate: '2026-05-01' }),
        null,
        'trip',
      ],
      options,
    );
    expect(result.map((trip) => trip.id)).toEqual(['ok']);
    expect(result[0].title).toBe('Paris getaway');
    expect(console.warn).toHaveBeenCalledWith('trips: dropped 7 invalid trips and 0 invalid items');
  });

  it('drops only invalid child items and repairs optional fields', () => {
    const trip = makeTrip({
      lat: 'north',
      flagUrl: 'javascript:alert(1)',
      currency: 'euro',
      budget: { totalCents: -5 },
      expenses: [
        { id: 'e1', category: 'food', description: 'Lunch', amountCents: 1250, date: '2026-05-01' },
        { id: 'e2', category: 'weird', amountCents: 500, date: 'nope' },
        { id: 'e3', amountCents: 12.5 },
        { amountCents: 100 },
      ],
      savedLinks: [
        { id: 'l1', type: 'hotel', label: 'Hotel', url: 'https://hotel.example' },
        { id: 'l2', type: 'hotel', label: 'Bad', url: 'javascript:alert(1)' },
      ],
    });
    trip.days[0].activities = [
      { id: 'a1', title: 'Louvre', time: '25:00', category: 'museum', url: 'data:text/html,x' },
      { id: 'a2', title: '' },
    ];

    const [clean] = sanitizeTrips([trip], options);

    expect(clean).toMatchObject({
      lat: null,
      flagUrl: null,
      currency: 'USD',
      budget: { totalCents: 0 },
    });
    expect(clean.expenses).toEqual([
      { id: 'e1', category: 'food', description: 'Lunch', amountCents: 1250, date: '2026-05-01' },
      { id: 'e2', category: 'other', description: '', amountCents: 500, date: null },
    ]);
    expect(clean.savedLinks.map((link) => link.id)).toEqual(['l1']);
    expect(clean.days[0].activities).toEqual([
      {
        id: 'a1',
        title: 'Louvre',
        time: null,
        location: '',
        notes: '',
        category: 'other',
        url: '',
      },
    ]);
    expect(console.warn).toHaveBeenCalledWith('trips: dropped 0 invalid trips and 4 invalid items');
  });

  it('repairs days to exactly one per date in range', () => {
    const trip = makeTrip({
      days: [
        { id: 'd2', date: '2026-05-02', notes: 'first', activities: [] },
        { id: 'dup', date: '2026-05-02', notes: 'duplicate', activities: [] },
        { id: 'out', date: '2026-06-01', notes: '', activities: [] },
        { id: 'bad', date: 'x', notes: '', activities: [] },
      ],
    });
    const [clean] = sanitizeTrips([trip], { now: NOW, createId: idFactory('fix') });
    expect(clean.days.map((day) => [day.id, day.date])).toEqual([
      ['fix-1', '2026-05-01'],
      ['d2', '2026-05-02'],
      ['fix-2', '2026-05-03'],
    ]);
  });

  it('fills missing timestamps', () => {
    const [clean] = sanitizeTrips([makeTrip({ createdAt: 'x', updatedAt: undefined })], options);
    expect(clean).toMatchObject({ createdAt: NOW, updatedAt: NOW });
  });

  it('returns [] for non-arrays', () => {
    expect(sanitizeTrips(null)).toEqual([]);
    expect(sanitizeTrips({})).toEqual([]);
  });
});

describe('mergeTrips', () => {
  const current = [
    makeTrip({ id: 'a', title: 'Kept', updatedAt: '2026-06-01T00:00:00.000Z' }),
    makeTrip({ id: 'b', title: 'Old', updatedAt: '2026-01-01T00:00:00.000Z' }),
  ];

  it('adds new trips and replaces only with more recently edited copies', () => {
    const merged = mergeTrips(current, [
      makeTrip({ id: 'a', title: 'Older import', updatedAt: '2026-05-01T00:00:00.000Z' }),
      makeTrip({ id: 'b', title: 'Newer import', updatedAt: '2026-02-01T00:00:00.000Z' }),
      makeTrip({ id: 'c', title: 'New' }),
    ]);
    expect(merged.map((trip) => trip.title)).toEqual(['Kept', 'Newer import', 'New']);
  });

  it('returns the same array when nothing changes', () => {
    expect(mergeTrips(current, [])).toBe(current);
    expect(mergeTrips(current, [current[0]])).toBe(current);
  });
});
