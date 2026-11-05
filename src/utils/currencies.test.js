// @vitest-environment node
import { getCurrencyOptions } from './currencies.js';

describe('getCurrencyOptions', () => {
  it('lists ISO codes with readable names', () => {
    const options = getCurrencyOptions();
    expect(options.length).toBeGreaterThan(20);
    expect(options.find((option) => option.code === 'EUR').label).toMatch(/^EUR · /);
    options.forEach((option) => expect(option.code).toMatch(/^[A-Z]{3}$/));
  });

  it('includes a requested code that the browser does not know', () => {
    const options = getCurrencyOptions('XQQ');
    expect(options.some((option) => option.code === 'XQQ')).toBe(true);
    expect(options.map((option) => option.code)).toEqual(
      [...options.map((option) => option.code)].sort(),
    );
  });
});
