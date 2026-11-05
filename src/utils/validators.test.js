// @vitest-environment node
import {
  validateBookingSearch,
  checkAmount,
  hasErrors,
  validateActivity,
  validateBudget,
  validateDay,
  validateExpense,
  validateSavedLink,
  validateTrip,
} from './validators.js';

const validTrip = {
  title: 'Paris getaway',
  countryCode: 'FRA',
  startDate: '2026-05-01',
  endDate: '2026-05-07',
};
const validActivity = {
  title: 'Louvre',
  time: '10:00',
  location: 'Rue de Rivoli',
  notes: '',
  url: '',
  category: 'sightseeing',
};
const validExpense = {
  description: 'Hotel',
  amount: '450.00',
  category: 'accommodation',
  date: '2026-05-01',
};
const validLink = {
  type: 'hotel',
  label: 'Hotel confirmation',
  url: 'https://booking.com/conf/123',
};

describe('hasErrors', () => {
  it('is false for an empty object', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ title: 'x' })).toBe(true);
  });
});

describe('validateTrip', () => {
  it('accepts a valid trip', () => {
    expect(validateTrip(validTrip)).toEqual({});
  });

  it('requires all fields', () => {
    expect(validateTrip({})).toEqual({
      title: 'Trip name is required.',
      countryCode: 'Choose a destination.',
      startDate: 'Start date is required.',
      endDate: 'End date is required.',
    });
  });

  it('trims the title and limits it to 80 characters', () => {
    expect(validateTrip({ ...validTrip, title: '   ' }).title).toMatch(/required/);
    expect(validateTrip({ ...validTrip, title: 'a'.repeat(80) })).toEqual({});
    expect(validateTrip({ ...validTrip, title: 'a'.repeat(81) }).title).toMatch(/80 characters/);
  });

  it('rejects malformed country codes and dates', () => {
    expect(validateTrip({ ...validTrip, countryCode: 'fr' }).countryCode).toMatch(/from the list/);
    expect(validateTrip({ ...validTrip, startDate: '2026-02-30' }).startDate).toMatch(
      /valid start/,
    );
  });

  it('requires end date on or after start date', () => {
    expect(validateTrip({ ...validTrip, endDate: '2026-05-01' })).toEqual({});
    expect(validateTrip({ ...validTrip, endDate: '2026-04-30' }).endDate).toMatch(/on or after/);
  });

  it('limits trips to 60 days', () => {
    expect(validateTrip({ ...validTrip, endDate: '2026-06-29' })).toEqual({}); // 60 days
    expect(validateTrip({ ...validTrip, endDate: '2026-06-30' }).endDate).toMatch(/60 days/);
  });
});

describe('checkAmount / validateBudget', () => {
  it.each([
    ['', 'Enter an amount.'],
    ['abc', 'Enter a valid amount, for example 125.50.'],
    ['-1', 'Amount cannot be negative.'],
    ['1.234', 'Use at most 2 decimal places.'],
    ['10000000.01', 'Amount must be 10,000,000 or less.'],
    ['0', 'Amount must be greater than 0.'],
  ])('%s -> %s', (value, message) => {
    expect(checkAmount(value)).toBe(message);
  });

  it('accepts the maximum and allows zero for budgets', () => {
    expect(checkAmount('10000000')).toBeNull();
    expect(validateBudget({ total: '0' })).toEqual({});
    expect(validateBudget({ total: '' })).toEqual({ total: 'Enter an amount.' });
  });
});

describe('validateDay', () => {
  it('limits notes to 2000 characters', () => {
    expect(validateDay({ notes: 'a'.repeat(2000) })).toEqual({});
    expect(validateDay({ notes: 'a'.repeat(2001) }).notes).toMatch(/2000/);
  });
});

describe('validateActivity', () => {
  it('accepts a valid activity with optional fields empty', () => {
    expect(validateActivity(validActivity)).toEqual({});
    expect(validateActivity({ title: 'Walk', category: 'other' })).toEqual({});
  });

  it('validates each field', () => {
    expect(
      validateActivity({
        title: '',
        time: '25:00',
        location: 'x'.repeat(101),
        notes: 'x'.repeat(1001),
        url: 'javascript:alert(1)',
        category: 'party',
      }),
    ).toEqual({
      title: 'Title is required.',
      time: 'Enter a valid time (HH:MM).',
      location: 'Location must be 100 characters or fewer.',
      notes: 'Notes must be 1000 characters or fewer.',
      url: 'Enter a valid web address starting with http:// or https://.',
      category: 'Choose a category.',
    });
  });

  it('accepts scheme-less URLs (they are normalised to https)', () => {
    expect(validateActivity({ ...validActivity, url: 'louvre.fr/tickets' })).toEqual({});
  });
});

describe('validateExpense', () => {
  it('accepts a valid expense; description and date are optional', () => {
    expect(validateExpense(validExpense)).toEqual({});
    expect(validateExpense({ amount: '5', category: 'food' })).toEqual({});
  });

  it('validates amount, category, description and date', () => {
    expect(
      validateExpense({
        description: 'x'.repeat(101),
        amount: '0',
        category: 'misc',
        date: '2026-13-01',
      }),
    ).toEqual({
      description: 'Description must be 100 characters or fewer.',
      amount: 'Amount must be greater than 0.',
      category: 'Choose a category.',
      date: 'Enter a valid date.',
    });
  });
});

describe('validateSavedLink', () => {
  it('accepts a valid link', () => {
    expect(validateSavedLink(validLink)).toEqual({});
  });

  it('requires type, label and a safe URL', () => {
    expect(validateSavedLink({ type: 'car', label: '', url: '' })).toEqual({
      type: 'Choose a link type.',
      label: 'Label is required.',
      url: 'Link is required.',
    });
    expect(validateSavedLink({ ...validLink, url: 'data:text/html,hi' }).url).toMatch(
      /valid web address/,
    );
    expect(
      validateSavedLink({ ...validLink, url: `https://x.com/${'a'.repeat(2000)}` }).url,
    ).toMatch(/2000 characters/);
  });
});

describe('validateBudget currency', () => {
  it('checks the currency only when given', () => {
    expect(validateBudget({ total: '100', currency: 'EUR' })).toEqual({});
    expect(validateBudget({ total: '100', currency: 'euro' })).toEqual({
      currency: 'Choose a currency.',
    });
    expect(validateBudget({ total: '100' })).toEqual({});
  });
});

describe('validateBookingSearch', () => {
  const today = '2026-05-01';
  const hotel = {
    where: 'Rome',
    from: '',
    checkIn: '2026-05-02',
    checkOut: '2026-05-04',
    adults: '2',
    rooms: '1',
  };
  const check = (type, extra) => validateBookingSearch(type, { ...hotel, ...extra }, today);

  it('accepts valid searches, with or without dates', () => {
    expect(check('hotel')).toEqual({});
    expect(check('hotel', { checkIn: '', checkOut: '' })).toEqual({});
    expect(check('flight', { checkOut: '' })).toEqual({});
    expect(check('activity', { checkIn: 'nonsense', adults: '0' })).toEqual({});
  });

  it('needs a destination of at most 100 characters', () => {
    expect(check('hotel', { where: '  ' })).toEqual({ where: 'Enter a city or country.' });
    expect(check('flight', { where: '' }).where).toBe('Enter where you are flying to.');
    expect(check('activity', { where: 'x'.repeat(101) }).where).toMatch(/at most 100/);
    expect(check('flight', { from: 'x'.repeat(101) }).from).toMatch(/at most 100/);
  });

  it('rejects past, invalid and out-of-order dates', () => {
    expect(check('hotel', { checkIn: '2026-04-30' }).checkIn).toBe('Pick today or a later date.');
    expect(check('hotel', { checkOut: '2026-13-01' }).checkOut).toBe('Enter a valid date.');
    expect(check('hotel', { checkOut: '2026-05-02' }).checkOut).toBe(
      'Check-out must be after check-in.',
    );
    expect(check('hotel', { checkOut: '' }).checkOut).toBe('Add a check-out date too.');
    expect(check('hotel', { checkIn: '' }).checkIn).toMatch(/Add a check-in date too/);
    expect(check('flight', { checkIn: '' }).checkIn).toMatch(/Add a departure date too/);
    expect(check('flight', { checkOut: '2026-05-01' }).checkOut).toBe(
      "Return can't be before departure.",
    );
    expect(check('flight', { checkOut: '2026-05-02' })).toEqual({}); // same-day return
  });

  it('checks adults and rooms for hotels', () => {
    expect(check('hotel', { adults: '0' }).adults).toBe('Enter 1 to 30 adults.');
    expect(check('hotel', { adults: '2.5' }).adults).toBe('Enter 1 to 30 adults.');
    expect(check('hotel', { rooms: '31' }).rooms).toBe('Enter 1 to 30 rooms.');
    expect(check('hotel', { rooms: '3' }).rooms).toBe("Rooms can't be more than adults.");
    expect(check('flight', { adults: '0' })).toEqual({});
  });
});
