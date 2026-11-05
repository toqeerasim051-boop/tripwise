// @vitest-environment node
import {
  activityToValues,
  addActivity,
  applyActivityValues,
  buildDays,
  createActivity,
  findActivity,
  getDaysLosingContent,
  moveActivity,
  reconcileDays,
  removeActivity,
  sortDayByTime,
  updateActivity,
  updateDayNotes,
} from './itinerary.js';

function idFactory() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

const activity = { id: 'a1', title: 'Louvre' };

describe('buildDays', () => {
  it('creates one empty day per date', () => {
    expect(buildDays('2026-05-30', '2026-06-01', idFactory())).toEqual([
      { id: 'id-1', date: '2026-05-30', notes: '', activities: [] },
      { id: 'id-2', date: '2026-05-31', notes: '', activities: [] },
      { id: 'id-3', date: '2026-06-01', notes: '', activities: [] },
    ]);
  });
});

describe('reconcileDays', () => {
  const days = [
    { id: 'd1', date: '2026-05-01', notes: 'Arrive', activities: [] },
    { id: 'd2', date: '2026-05-02', notes: '', activities: [activity] },
    { id: 'd3', date: '2026-05-03', notes: '', activities: [] },
  ];

  it('keeps existing days (same objects) and adds new dates', () => {
    const result = reconcileDays(days, '2026-05-02', '2026-05-05', idFactory());
    expect(result.map((day) => day.id)).toEqual(['d2', 'd3', 'id-1', 'id-2']);
    expect(result[0]).toBe(days[1]);
    expect(result.map((day) => day.date)).toEqual([
      '2026-05-02',
      '2026-05-03',
      '2026-05-04',
      '2026-05-05',
    ]);
  });

  it('orders by date even if stored days were out of order', () => {
    const result = reconcileDays(
      [days[2], days[0], days[1]],
      '2026-05-01',
      '2026-05-03',
      idFactory(),
    );
    expect(result.map((day) => day.id)).toEqual(['d1', 'd2', 'd3']);
  });
});

describe('getDaysLosingContent', () => {
  const days = [
    { id: 'd1', date: '2026-05-01', notes: 'Arrive', activities: [] },
    { id: 'd2', date: '2026-05-02', notes: '', activities: [activity] },
    { id: 'd3', date: '2026-05-03', notes: '  ', activities: [] },
  ];

  it('lists dropped days that have notes or activities', () => {
    expect(getDaysLosingContent(days, '2026-05-03', '2026-05-04').map((d) => d.id)).toEqual([
      'd1',
      'd2',
    ]);
  });

  it('ignores dropped empty days and kept days', () => {
    expect(getDaysLosingContent(days, '2026-05-01', '2026-05-02')).toEqual([]);
  });
});

// ---------- activities ----------

const act = (id, extra = {}) => ({
  id,
  title: id.toUpperCase(),
  time: null,
  location: '',
  notes: '',
  category: 'other',
  url: '',
  ...extra,
});

function itinerary() {
  return [
    { id: 'd1', date: '2026-05-01', notes: '', activities: [act('a'), act('b'), act('c')] },
    { id: 'd2', date: '2026-05-02', notes: '', activities: [act('x')] },
  ];
}

const ids = (days) => days.map((day) => day.activities.map((activity) => activity.id));

describe('createActivity / applyActivityValues', () => {
  const values = {
    title: '  Louvre ',
    time: '',
    location: ' Rue de Rivoli ',
    notes: ' Book ahead ',
    category: 'sightseeing',
    url: 'louvre.fr/tickets',
  };

  it('trims text, maps an empty time to null and normalises the URL', () => {
    expect(createActivity(values, () => 'new-id')).toEqual({
      id: 'new-id',
      title: 'Louvre',
      time: null,
      location: 'Rue de Rivoli',
      notes: 'Book ahead',
      category: 'sightseeing',
      url: 'https://louvre.fr/tickets',
    });
  });

  it('keeps the id when applying edits, and round-trips through form values', () => {
    const original = act('a', { time: '09:30', url: 'https://x.example' });
    const edited = applyActivityValues(original, { ...activityToValues(original), title: 'New' });
    expect(edited).toEqual({ ...original, title: 'New' });
    expect(activityToValues(act('b'))).toMatchObject({ time: '' });
  });
});

describe('findActivity', () => {
  it('locates an activity by id', () => {
    const days = itinerary();
    expect(findActivity(days, 'c')).toEqual({ day: days[0], dayIndex: 0, index: 2 });
    expect(findActivity(days, 'nope')).toBeNull();
  });
});

describe('add / update / remove', () => {
  it('adds to the end of a day', () => {
    expect(ids(addActivity(itinerary(), 'd2', act('y')))).toEqual([
      ['a', 'b', 'c'],
      ['x', 'y'],
    ]);
  });

  it('updates in place and removes', () => {
    const days = itinerary();
    expect(updateActivity(days, { ...act('b'), title: 'Changed' })[0].activities[1].title).toBe(
      'Changed',
    );
    expect(ids(removeActivity(days, 'b'))).toEqual([['a', 'c'], ['x']]);
  });

  it('returns the same array when nothing matches', () => {
    const days = itinerary();
    expect(addActivity(days, 'missing-day', act('y'))).toBe(days);
    expect(updateActivity(days, act('missing'))).toBe(days);
    expect(removeActivity(days, 'missing')).toBe(days);
  });

  it('does not mutate the input', () => {
    const days = itinerary();
    removeActivity(days, 'a');
    expect(ids(days)).toEqual([['a', 'b', 'c'], ['x']]);
  });
});

describe('moveActivity', () => {
  it.each([
    ['a', 'd1', 1, [['b', 'a', 'c'], ['x']]], // down
    ['c', 'd1', 1, [['a', 'c', 'b'], ['x']]], // up
    ['a', 'd1', 99, [['b', 'c', 'a'], ['x']]], // clamped to end
    ['c', 'd1', -5, [['c', 'a', 'b'], ['x']]], // clamped to start
    [
      'b',
      'd2',
      1,
      [
        ['a', 'c'],
        ['x', 'b'],
      ],
    ], // other day, end
    ['x', 'd1', 0, [['x', 'a', 'b', 'c'], []]], // other day, start
  ])('moves %s to %s at %i', (activityId, toDayId, toIndex, expected) => {
    expect(ids(moveActivity(itinerary(), activityId, toDayId, toIndex))).toEqual(expected);
  });

  it('returns the same array for no-op moves and unknown ids', () => {
    const days = itinerary();
    expect(moveActivity(days, 'b', 'd1', 1)).toBe(days);
    expect(moveActivity(days, 'nope', 'd1', 0)).toBe(days);
    expect(moveActivity(days, 'a', 'nope', 0)).toBe(days);
  });
});

describe('sortDayByTime', () => {
  it('puts timed activities first by time, keeping untimed order', () => {
    const days = [
      {
        id: 'd1',
        date: '2026-05-01',
        notes: '',
        activities: [
          act('u1'),
          act('late', { time: '18:00' }),
          act('u2'),
          act('early', { time: '08:15' }),
        ],
      },
    ];
    expect(ids(sortDayByTime(days, 'd1'))).toEqual([['early', 'late', 'u1', 'u2']]);
  });

  it('returns the same array when already sorted', () => {
    const days = itinerary();
    expect(sortDayByTime(days, 'd1')).toBe(days);
  });
});

describe('updateDayNotes', () => {
  it('trims and saves notes, returning the same array when unchanged', () => {
    const days = itinerary();
    const updated = updateDayNotes(days, 'd1', '  Arrive at noon ');
    expect(updated[0].notes).toBe('Arrive at noon');
    expect(updateDayNotes(updated, 'd1', 'Arrive at noon')).toBe(updated);
  });
});
