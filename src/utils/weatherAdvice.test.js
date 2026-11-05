// @vitest-environment node
import {
  WET_PROBABILITY,
  findDryDay,
  forecastByDate,
  getWeatherWarnings,
  isOutdoor,
  isWetDay,
} from './weatherAdvice.js';

const sky = (date, weatherCode, precipitationProbability = null) => ({
  date,
  max: 20,
  min: 10,
  weatherCode,
  precipitationProbability,
});
const activity = (id, category) => ({ id, title: id, category });
const day = (id, date, activities = []) => ({ id, date, notes: '', activities });

describe('isWetDay', () => {
  it('is true for rain, snow and storms', () => {
    expect(isWetDay(sky('2026-11-01', 61))).toBe(true);
    expect(isWetDay(sky('2026-11-01', 73))).toBe(true);
    expect(isWetDay(sky('2026-11-01', 95))).toBe(true);
  });

  it('is true for a high chance of rain, whatever the code', () => {
    expect(isWetDay(sky('2026-11-01', 3, WET_PROBABILITY))).toBe(true);
    expect(isWetDay(sky('2026-11-01', 3, WET_PROBABILITY - 1))).toBe(false);
  });

  it('is false for clear, cloudy, drizzle without a high chance, and unknown days', () => {
    expect(isWetDay(sky('2026-11-01', 0))).toBe(false);
    expect(isWetDay(sky('2026-11-01', 3))).toBe(false);
    expect(isWetDay(sky('2026-11-01', 51, 30))).toBe(false);
    expect(isWetDay(undefined)).toBe(false);
    expect(isWetDay(sky('2026-11-01', null))).toBe(false);
  });
});

describe('isOutdoor', () => {
  it('treats sightseeing and events as outdoor', () => {
    expect(isOutdoor(activity('a', 'sightseeing'))).toBe(true);
    expect(isOutdoor(activity('a', 'event'))).toBe(true);
    expect(isOutdoor(activity('a', 'food'))).toBe(false);
    expect(isOutdoor(activity('a', 'lodging'))).toBe(false);
  });
});

describe('forecastByDate', () => {
  it('maps dates to forecast days and handles a missing forecast', () => {
    const map = forecastByDate({ daily: [sky('2026-11-01', 0), sky('2026-11-02', 61)] });
    expect(map.get('2026-11-02').weatherCode).toBe(61);
    expect(forecastByDate(null).size).toBe(0);
  });
});

describe('findDryDay', () => {
  const byDate = forecastByDate({
    daily: [
      sky('2026-11-01', 61),
      sky('2026-11-02', 0),
      sky('2026-11-03', 0),
      sky('2026-11-04', 95),
    ],
  });

  it('prefers the dry day with fewest activities, then the closest one', () => {
    const days = [
      day('d1', '2026-11-01'),
      day('d2', '2026-11-02', [activity('x', 'food')]),
      day('d3', '2026-11-03'),
      day('d4', '2026-11-04'),
    ];
    expect(findDryDay(days, byDate, days[0]).id).toBe('d3');
    days[1].activities = [];
    expect(findDryDay(days, byDate, days[0]).id).toBe('d2');
    expect(findDryDay(days, byDate, days[3]).id).toBe('d3'); // closer than d2
  });

  it('ignores wet days and days outside the forecast', () => {
    const days = [day('d1', '2026-11-01'), day('d4', '2026-11-04'), day('d9', '2026-12-01')];
    expect(findDryDay(days, byDate, days[0])).toBeNull();
  });
});

describe('getWeatherWarnings', () => {
  it('warns only for wet days that have outdoor plans', () => {
    const byDate = forecastByDate({
      daily: [sky('2026-11-01', 61, 80), sky('2026-11-02', 0), sky('2026-11-03', 63)],
    });
    const days = [
      day('d1', '2026-11-01', [activity('museum', 'sightseeing'), activity('lunch', 'food')]),
      day('d2', '2026-11-02', [activity('walk', 'sightseeing')]),
      day('d3', '2026-11-03', [activity('dinner', 'food')]),
    ];

    const warnings = getWeatherWarnings(days, byDate);
    expect([...warnings.keys()]).toEqual(['d1']);
    expect(warnings.get('d1')).toEqual({
      forecast: byDate.get('2026-11-01'),
      activities: [days[0].activities[0]],
      dryDayId: 'd2',
    });
  });

  it('returns no warnings without a forecast', () => {
    const days = [day('d1', '2026-11-01', [activity('walk', 'sightseeing')])];
    expect(getWeatherWarnings(days, forecastByDate(null)).size).toBe(0);
  });
});
