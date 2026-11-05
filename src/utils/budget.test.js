// @vitest-environment node
import {
  applyExpenseValues,
  createExpense,
  expenseName,
  expenseToValues,
  getBudgetForecast,
  getBudgetSummary,
  getCategoryBreakdown,
  sortExpenses,
  totalSpent,
} from './budget.js';
import { makeTrip } from '../test/fixtures.js';

const expense = (id, amountCents, category = 'food', extra = {}) => ({
  id,
  category,
  description: '',
  amountCents,
  date: null,
  ...extra,
});

describe('totalSpent / getBudgetSummary', () => {
  const tripWith = (totalCents, expenses) =>
    makeTrip({ budget: { totalCents }, expenses, startDate: '2026-05-01', endDate: '2026-05-04' });

  it('sums cents exactly', () => {
    expect(totalSpent([expense('a', 10), expense('b', 20)])).toBe(30);
    expect(totalSpent([])).toBe(0);
  });

  it('reports no budget', () => {
    expect(getBudgetSummary(tripWith(0, [expense('a', 500)]))).toEqual({
      budgetCents: 0,
      spentCents: 500,
      remainingCents: -500,
      hasBudget: false,
      usedRatio: null,
      status: 'none',
      dailyBudgetCents: null,
      expenseCount: 1,
    });
  });

  it.each([
    [100_00, 50_00, 'ok', 50_00],
    [100_00, 74_99, 'ok', 25_01],
    [100_00, 75_00, 'warning', 25_00],
    [100_00, 90_00, 'warning', 10_00],
    [100_00, 100_00, 'warning', 0],
    [100_00, 100_01, 'over', -1],
  ])('budget %i, spent %i -> %s', (budget, spent, status, remaining) => {
    const summary = getBudgetSummary(tripWith(budget, [expense('a', spent)]));
    expect(summary).toMatchObject({ status, remainingCents: remaining, hasBudget: true });
    expect(summary.usedRatio).toBeCloseTo(spent / budget);
  });

  it('computes a whole-cent daily budget over the inclusive trip length', () => {
    expect(getBudgetSummary(tripWith(1000_01, [])).dailyBudgetCents).toBe(250_00); // 4 days
  });
});

describe('getCategoryBreakdown', () => {
  it('groups by category, largest first, omitting empty categories', () => {
    const rows = getCategoryBreakdown([
      expense('a', 300, 'food'),
      expense('b', 600, 'accommodation'),
      expense('c', 100, 'food'),
      expense('d', 0, 'shopping'),
    ]);
    expect(rows).toEqual([
      { category: 'accommodation', label: 'Accommodation', cents: 600, share: 0.6 },
      { category: 'food', label: 'Food & drink', cents: 400, share: 0.4 },
    ]);
  });

  it('keeps category order for ties and handles no spending', () => {
    expect(
      getCategoryBreakdown([expense('a', 100, 'other'), expense('b', 100, 'transport')]).map(
        (row) => row.category,
      ),
    ).toEqual(['transport', 'other']);
    expect(getCategoryBreakdown([])).toEqual([]);
  });
});

describe('sortExpenses', () => {
  it('newest date first, undated last, then most recently added first', () => {
    const list = [
      expense('old', 1, 'food', { date: '2026-05-01' }),
      expense('undated-1', 1),
      expense('new', 1, 'food', { date: '2026-05-03' }),
      expense('undated-2', 1),
      expense('same-day-later', 1, 'food', { date: '2026-05-01' }),
    ];
    expect(sortExpenses(list).map((item) => item.id)).toEqual([
      'new',
      'same-day-later',
      'old',
      'undated-2',
      'undated-1',
    ]);
  });
});

describe('expense objects', () => {
  const values = {
    description: '  Hotel ',
    amount: '1.234,50',
    category: 'accommodation',
    date: '',
  };

  it('creates from form values with exact cents', () => {
    expect(createExpense(values, () => 'e1')).toEqual({
      id: 'e1',
      category: 'accommodation',
      description: 'Hotel',
      amountCents: 123450,
      date: null,
    });
  });

  it('round-trips through form values and keeps the id on edit', () => {
    const stored = expense('e1', 4505, 'food', { description: 'Dinner', date: '2026-05-02' });
    expect(expenseToValues(stored)).toEqual({
      description: 'Dinner',
      amount: '45.05',
      category: 'food',
      date: '2026-05-02',
    });
    expect(applyExpenseValues(stored, expenseToValues(stored))).toEqual(stored);
  });

  it('names expenses by description, else category', () => {
    expect(expenseName(expense('a', 1, 'transport', { description: 'Taxi' }))).toBe('Taxi');
    expect(expenseName(expense('a', 1, 'transport'))).toBe('Transport');
  });
});

describe('getBudgetForecast', () => {
  // makeTrip: 2026-05-01 .. 2026-05-03 (3 days)
  const trip = (totalCents, expenses = []) => makeTrip({ budget: { totalCents }, expenses });

  it('is null without a budget or once the trip has ended', () => {
    expect(getBudgetForecast(trip(0), '2026-04-01')).toBeNull();
    expect(getBudgetForecast(trip(30000), '2026-05-04')).toBeNull();
  });

  it('before the trip, spreads what is left over every trip day', () => {
    const forecast = getBudgetForecast(trip(30000, [expense('hotel', 12000)]), '2026-04-21');
    expect(forecast).toEqual({
      phase: 'before',
      daysUntilStart: 10,
      daysLeft: 3,
      dailyAllowanceCents: 6000,
    });
  });

  it('before the trip, allows nothing when bookings use the whole budget', () => {
    expect(
      getBudgetForecast(trip(10000, [expense('hotel', 12000)]), '2026-04-21').dailyAllowanceCents,
    ).toBe(0);
  });

  it('during the trip, projects the pace of trip-day spending', () => {
    const expenses = [
      expense('hotel', 10000), // undated booking: spent, but not part of the pace
      expense('day1', 6000, 'food', { date: '2026-05-01' }),
      expense('day2', 4000, 'food', { date: '2026-05-02' }),
      expense('later', 2000, 'activities', { date: '2026-05-03' }), // prepaid for tomorrow
    ];
    const forecast = getBudgetForecast(trip(30000, expenses), '2026-05-02');
    expect(forecast).toEqual({
      phase: 'during',
      daysLeft: 2,
      dailyAllowanceCents: 4000, // (30000 - 22000) / 2
      dailyPaceCents: 5000, // 10000 over 2 days
      projectedCents: 27000, // 22000 + 5000 for the last day
      projectedOverCents: -3000,
    });
  });

  it('during the trip, flags a projected overspend', () => {
    const expenses = [expense('day1', 15000, 'food', { date: '2026-05-01' })];
    const forecast = getBudgetForecast(trip(30000, expenses), '2026-05-01');
    expect(forecast.projectedCents).toBe(45000);
    expect(forecast.projectedOverCents).toBe(15000);
    expect(forecast.daysLeft).toBe(3);
    expect(forecast.dailyAllowanceCents).toBe(5000);
  });

  it('on the last day, has no days to project and allows what is left', () => {
    const expenses = [expense('day1', 9000, 'food', { date: '2026-05-01' })];
    const forecast = getBudgetForecast(trip(30000, expenses), '2026-05-03');
    expect(forecast).toMatchObject({
      daysLeft: 1,
      dailyAllowanceCents: 21000,
      dailyPaceCents: 3000,
      projectedCents: 9000,
    });
  });
});
