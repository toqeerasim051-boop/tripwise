// @vitest-environment node
import { centsToInputValue, formatMoney, parseAmount, toCents } from './money.js';

describe('parseAmount', () => {
  it.each([
    ['0', 0],
    ['12', 1200],
    ['12.5', 1250],
    ['12.05', 1205],
    ['.5', 50],
    ['5.', 500],
    ['+3', 300],
    ['1,234.56', 123456],
    ['1.234,56', 123456],
    ['1 234,56', 123456],
    ["1'234.50", 123450],
    ['12,5', 1250],
    ['1,500', 150000],
    ['1.234.567', 123456700],
    ['  42  ', 4200],
    [19.99, 1999],
    ['0.10', 10],
  ])('parses %s -> %i cents', (input, cents) => {
    expect(parseAmount(input)).toEqual({ ok: true, cents });
  });

  it('avoids floating point drift', () => {
    expect(toCents('0.1') + toCents('0.2')).toBe(30);
    expect(toCents('1.15')).toBe(115);
    expect(toCents('4.35')).toBe(435);
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    [undefined, 'empty'],
    ['abc', 'invalid'],
    ['1.2.3', 'invalid'],
    ['.', 'invalid'],
    ['1e5', 'invalid'],
    [Number.NaN, 'invalid'],
    ['-5', 'negative'],
    ['1.234', 'precision'],
    ['12,345', 'ok-thousands'],
    ['99999999999999', 'too-large'],
  ])('reports %s as %s', (input, reason) => {
    if (reason === 'ok-thousands') {
      expect(parseAmount(input)).toEqual({ ok: true, cents: 1234500 });
    } else {
      expect(parseAmount(input)).toEqual({ ok: false, reason });
    }
  });

  it('toCents returns null for invalid input', () => {
    expect(toCents('nope')).toBeNull();
  });
});

describe('centsToInputValue', () => {
  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [123450, '1234.50'],
    [-250, '-2.50'],
  ])('%i -> %s', (cents, text) => {
    expect(centsToInputValue(cents)).toBe(text);
  });

  it('round-trips through parseAmount', () => {
    expect(toCents(centsToInputValue(987654))).toBe(987654);
  });
});

describe('formatMoney', () => {
  it('formats with the currency and locale', () => {
    expect(formatMoney(123456, 'USD', 'en-US')).toBe('$1,234.56');
    expect(formatMoney(-500, 'USD', 'en-US')).toBe('-$5.00');
    expect(formatMoney(150000, 'JPY', 'en-US')).toBe('¥1,500');
  });

  it('falls back for currency codes Intl rejects', () => {
    expect(formatMoney(1250, 'NOT-A-CODE', 'en-US')).toBe('12.50 NOT-A-CODE');
  });
});
