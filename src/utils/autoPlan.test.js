// @vitest-environment node
import { MAX_PLANNED_PER_DAY, distanceKm, orderByRoute, planAttractions } from './autoPlan.js';
import { forecastByDate } from './weatherAdvice.js';

const sight = (id, lat, lon) => ({ id, name: id, place: 'Somewhere', lat, lon });
const day = (id, date, titles = []) => ({
  id,
  date,
  notes: '',
  activities: titles.map((title) => ({ id: `${id}-${title}`, title, category: 'sightseeing' })),
});
const names = (plan) =>
  plan.entries.map((entry) => [entry.day.id, entry.attractions.map((item) => item.id)]);

// Two clusters about 400 km apart: Paris (p1, p2) and Lyon (l1, l2; l2 is nearer Paris).
const p1 = sight('p1', 48.858, 2.294);
const l1 = sight('l1', 45.762, 4.835);
const p2 = sight('p2', 48.861, 2.336);
const l2 = sight('l2', 45.767, 4.834);

describe('distanceKm', () => {
  it('measures great-circle distance', () => {
    expect(distanceKm(p1, p1)).toBe(0);
    expect(distanceKm(p1, l1)).toBeGreaterThan(380);
    expect(distanceKm(p1, l1)).toBeLessThan(420);
  });
});

describe('orderByRoute', () => {
  it('visits the nearest sight next, so neighbours sit together', () => {
    expect(orderByRoute([p1, l1, p2, l2]).map((item) => item.id)).toEqual(['p1', 'p2', 'l2', 'l1']);
  });

  it('puts sights without coordinates last and handles an empty list', () => {
    const noCoords = { id: 'x', name: 'x', lat: null, lon: null };
    expect(orderByRoute([noCoords, p1]).map((item) => item.id)).toEqual(['p1', 'x']);
    expect(orderByRoute([])).toEqual([]);
  });
});

describe('planAttractions', () => {
  const days = () => [day('d1', '2026-11-01'), day('d2', '2026-11-02'), day('d3', '2026-11-03')];

  it('groups nearby sights on the same day, in date order', () => {
    const plan = planAttractions(days().slice(0, 2), [p1, l1, p2, l2]);
    expect(names(plan)).toEqual([
      ['d1', ['p1', 'p2']],
      ['d2', ['l2', 'l1']],
    ]);
    expect(plan.leftOver).toBe(0);
  });

  it('spreads sights evenly when there are more days than needed', () => {
    expect(names(planAttractions(days(), [p1, p2]))).toEqual([
      ['d1', ['p1']],
      ['d2', ['p2']],
    ]);
  });

  it('skips sights already in the trip (any day, any case)', () => {
    const trip = [day('d1', '2026-11-01', ['P1']), day('d2', '2026-11-02')];
    expect(names(planAttractions(trip, [p1, p2]))).toEqual([['d1', ['p2']]]);
  });

  it('fills wet days last', () => {
    const byDate = forecastByDate({
      daily: [
        { date: '2026-11-01', weatherCode: 63, precipitationProbability: 90 },
        { date: '2026-11-02', weatherCode: 0, precipitationProbability: 0 },
        { date: '2026-11-03', weatherCode: 0, precipitationProbability: 0 },
      ],
    });
    const plan = planAttractions(days(), [p1, p2], byDate);
    expect(names(plan)).toEqual([
      ['d2', ['p1']],
      ['d3', ['p2']],
    ]);
    expect(plan.entries.every((entry) => !entry.wet)).toBe(true);

    // With more sights than the dry days hold, the wet day takes the rest and is marked.
    const many = Array.from({ length: 7 }, (_, index) => sight(`s${index}`, 48 + index, 2));
    const full = planAttractions(days(), many, byDate);
    expect(
      full.entries.map((entry) => [entry.day.id, entry.attractions.length, entry.wet]),
    ).toEqual([
      ['d1', 1, true],
      ['d2', MAX_PLANNED_PER_DAY, false],
      ['d3', MAX_PLANNED_PER_DAY, false],
    ]);
  });

  it('never fills a day past the limit and reports what did not fit', () => {
    const busy = [day('d1', '2026-11-01', ['a', 'b']), day('d2', '2026-11-02', ['c', 'd', 'e'])];
    const many = Array.from({ length: 4 }, (_, index) => sight(`s${index}`, 48 + index, 2));
    const plan = planAttractions(busy, many);
    expect(names(plan)).toEqual([['d1', ['s0']]]);
    expect(plan.leftOver).toBe(3);
  });

  it('skips days before today', () => {
    expect(names(planAttractions(days(), [p1, p2], new Map(), '2026-11-02'))).toEqual([
      ['d2', ['p1']],
      ['d3', ['p2']],
    ]);
    expect(planAttractions(days(), [p1], new Map(), '2026-11-04').entries).toEqual([]);
  });

  it('returns an empty plan when nothing is left to add', () => {
    expect(planAttractions(days(), [])).toEqual({ entries: [], leftOver: 0 });
  });
});
