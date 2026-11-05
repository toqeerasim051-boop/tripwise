// @vitest-environment node
import {
  formatCompactNumber,
  formatList,
  formatNumber,
  formatPercent,
  formatTemperature,
  formatTimeAgo,
} from './formatters.js';

describe('formatters', () => {
  it('formats numbers', () => {
    expect(formatNumber(67_400_000, 'en-US')).toBe('67,400,000');
    expect(formatCompactNumber(67_400_000, 'en-US')).toBe('67.4M');
    expect(formatCompactNumber(1_200, 'en-US')).toBe('1.2K');
  });

  it('formats weather values', () => {
    expect(formatTemperature(15.6)).toBe('16°C');
    expect(formatTemperature(-0.4, '°F')).toBe('0°F'); // never "-0"
    expect(formatPercent(72.6)).toBe('73%');
  });

  it('formats lists', () => {
    expect(formatList(['French'], 'en-US')).toBe('French');
    expect(formatList(['French', 'German', 'Italian'], 'en-US')).toBe(
      'French, German, and Italian',
    );
  });

  it.each([null, undefined, Number.NaN, 'x'])('returns a dash for %s', (value) => {
    expect(formatNumber(value)).toBe('—');
    expect(formatCompactNumber(value)).toBe('—');
    expect(formatTemperature(value)).toBe('—');
    expect(formatPercent(value)).toBe('—');
  });

  it('returns a dash for empty lists', () => {
    expect(formatList([])).toBe('—');
    expect(formatList(null)).toBe('—');
  });
});

describe('formatTimeAgo', () => {
  const now = Date.UTC(2026, 9, 28, 12);
  const ago = (ms) => formatTimeAgo(now - ms, now, 'en');

  it('uses minutes, then hours, then days', () => {
    expect(ago(45 * 60_000)).toBe('45 minutes ago');
    expect(ago(3 * 3_600_000)).toBe('3 hours ago');
    expect(ago(26 * 3_600_000)).toBe('yesterday');
    expect(ago(3 * 86_400_000)).toBe('3 days ago');
  });

  it('never goes into the future', () => {
    expect(formatTimeAgo(now + 60_000, now, 'en')).toBe('this minute');
  });
});
