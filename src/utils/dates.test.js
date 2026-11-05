// @vitest-environment node
import {
  addDays,
  diffInDays,
  eachDayInRange,
  formatDate,
  formatDateRange,
  isValidIsoDate,
  isValidTime,
  parseIsoDate,
  todayIso,
  tripLengthInDays,
} from './dates.js';

describe('parseIsoDate / isValidIsoDate', () => {
  it.each(['2026-01-31', '2024-02-29', '2026-12-01'])('accepts %s', (value) => {
    expect(isValidIsoDate(value)).toBe(true);
  });

  it.each(['2025-02-29', '2026-02-30', '2026-13-01', '2026-1-1', '26-01-01', '', null, 20260101])(
    'rejects %s',
    (value) => {
      expect(isValidIsoDate(value)).toBe(false);
    },
  );

  it('returns a UTC midnight date', () => {
    expect(parseIsoDate('2026-03-29').toISOString()).toBe('2026-03-29T00:00:00.000Z');
  });
});

describe('date arithmetic', () => {
  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // EU DST change
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('nope', 1)).toBeNull();
  });

  it('diffs days and computes inclusive trip length', () => {
    expect(diffInDays('2026-03-01', '2026-03-08')).toBe(7);
    expect(diffInDays('2026-03-08', '2026-03-01')).toBe(-7);
    expect(tripLengthInDays('2026-03-01', '2026-03-01')).toBe(1);
    expect(tripLengthInDays('2026-03-01', '2026-03-08')).toBe(8);
    expect(tripLengthInDays('2026-03-08', '2026-03-01')).toBeNull();
    expect(tripLengthInDays('x', '2026-03-01')).toBeNull();
  });

  it('lists every day in range inclusively', () => {
    expect(eachDayInRange('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    expect(eachDayInRange('2026-03-02', '2026-03-01')).toEqual([]);
    expect(() => eachDayInRange('2026-01-01', '2026-12-31', { max: 60 })).toThrow(RangeError);
  });

  it('returns local today', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('isValidTime', () => {
  it.each(['00:00', '09:30', '23:59'])('accepts %s', (value) =>
    expect(isValidTime(value)).toBe(true),
  );
  it.each(['24:00', '9:30', '12:60', '', null])('rejects %s', (value) =>
    expect(isValidTime(value)).toBe(false),
  );
});

describe('formatting', () => {
  it('formats date-only values without timezone shifts', () => {
    expect(formatDate('2026-03-05', undefined, 'en-US')).toBe('Mar 5, 2026');
    expect(formatDate('2026-01-01', { day: 'numeric' }, 'en-US')).toBe('1');
    expect(formatDate('bad', undefined, 'en-US')).toBe('');
  });

  it('formats ranges', () => {
    // Intl uses thin spaces (U+2009) around the en dash.
    expect(formatDateRange('2026-03-05', '2026-03-12', undefined, 'en-US')).toMatch(
      /^Mar 5\s–\s12, 2026$/u,
    );
    expect(formatDateRange('2026-03-05', 'bad', undefined, 'en-US')).toBe('');
  });
});
