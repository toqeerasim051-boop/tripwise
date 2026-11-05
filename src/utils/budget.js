/**
 * Pure budget maths. Everything is integer cents; derived values are computed here and never
 * stored on the trip.
 */
import { EXPENSE_CATEGORIES } from './constants.js';
import { centsToInputValue, toCents } from './money.js';
import { diffInDays, tripLengthInDays } from './dates.js';

/** Share of the budget used at which the meter turns from green to orange (the warning state). */
export const WARNING_THRESHOLD = 0.75;

export function totalSpent(expenses) {
  return expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
}

/**
 * {
 *   budgetCents, spentCents, remainingCents (negative when over), hasBudget,
 *   usedRatio (spent / budget, null without a budget), status: 'none'|'ok'|'warning'|'over',
 *   dailyBudgetCents (null without a budget), expenseCount
 * }
 */
export function getBudgetSummary(trip) {
  const budgetCents = trip.budget.totalCents;
  const spentCents = totalSpent(trip.expenses);
  const hasBudget = budgetCents > 0;
  const usedRatio = hasBudget ? spentCents / budgetCents : null;
  const days = tripLengthInDays(trip.startDate, trip.endDate) ?? 1;

  let status = 'none';
  if (hasBudget) {
    if (spentCents > budgetCents) status = 'over';
    else if (usedRatio >= WARNING_THRESHOLD) status = 'warning';
    else status = 'ok';
  }

  return {
    budgetCents,
    spentCents,
    remainingCents: budgetCents - spentCents,
    hasBudget,
    usedRatio,
    status,
    dailyBudgetCents: hasBudget ? Math.floor(budgetCents / days) : null,
    expenseCount: trip.expenses.length,
  };
}

/**
 * Where spending is heading, or null without a budget or after the trip has ended.
 * `today` is an ISO date. Expenses dated on trip days up to today set the daily pace; undated,
 * earlier or later ones (bookings, prepaid tickets) count as spent but not towards the pace.
 * {
 *   phase: 'before' | 'during',
 *   daysUntilStart ('before' only),
 *   daysLeft: trip days still to come, today included,
 *   dailyAllowanceCents: remaining budget spread over daysLeft (0 when nothing is left),
 *   dailyPaceCents, projectedCents, projectedOverCents ('during' only; over < 0 means under)
 * }
 */
export function getBudgetForecast(trip, today) {
  const budgetCents = trip.budget.totalCents;
  const tripDays = tripLengthInDays(trip.startDate, trip.endDate);
  if (budgetCents <= 0 || tripDays === null || today > trip.endDate) return null;

  const spentCents = totalSpent(trip.expenses);
  const remainingCents = budgetCents - spentCents;
  const allowance = (days) => Math.max(0, Math.floor(remainingCents / days));

  if (today < trip.startDate) {
    return {
      phase: 'before',
      daysUntilStart: diffInDays(today, trip.startDate),
      daysLeft: tripDays,
      dailyAllowanceCents: allowance(tripDays),
    };
  }

  const daysSoFar = diffInDays(trip.startDate, today) + 1; // today included
  const daysLeft = tripDays - daysSoFar + 1;
  const onTripCents = totalSpent(
    trip.expenses.filter(
      (expense) => expense.date && expense.date >= trip.startDate && expense.date <= today,
    ),
  );
  const dailyPaceCents = Math.round(onTripCents / daysSoFar);
  const projectedCents = spentCents + dailyPaceCents * (tripDays - daysSoFar);

  return {
    phase: 'during',
    daysLeft,
    dailyAllowanceCents: allowance(daysLeft),
    dailyPaceCents,
    projectedCents,
    projectedOverCents: projectedCents - budgetCents,
  };
}

/**
 * Spending per category, largest first (ties keep the category order), categories with no
 * spending omitted. `share` is the fraction of total spending (0..1).
 */
export function getCategoryBreakdown(expenses) {
  const spent = totalSpent(expenses);
  return EXPENSE_CATEGORIES.map((category) => ({
    category: category.value,
    label: category.label,
    cents: expenses
      .filter((expense) => expense.category === category.value)
      .reduce((sum, expense) => sum + expense.amountCents, 0),
  }))
    .filter((row) => row.cents > 0)
    .sort((a, b) => b.cents - a.cents)
    .map((row) => ({ ...row, share: spent > 0 ? row.cents / spent : 0 }));
}

/** Newest date first; undated expenses last; otherwise most recently added first. */
export function sortExpenses(expenses) {
  return expenses
    .map((expense, index) => ({ expense, index }))
    .sort((a, b) => {
      const dateA = a.expense.date;
      const dateB = b.expense.date;
      if (dateA && dateB && dateA !== dateB) return dateB.localeCompare(dateA);
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      return b.index - a.index;
    })
    .map(({ expense }) => expense);
}

// ---------- expense objects & form values (amounts arrive as validated strings) ----------

export const EMPTY_EXPENSE_VALUES = { description: '', amount: '', category: 'food', date: '' };

function expenseFields({ description, amount, category, date }) {
  return {
    category,
    description: (description ?? '').trim(),
    amountCents: toCents(amount),
    date: date ? date : null,
  };
}

export function createExpense(values, createId) {
  return { id: createId(), ...expenseFields(values) };
}

export function applyExpenseValues(expense, values) {
  return { ...expense, ...expenseFields(values) };
}

export function expenseToValues(expense) {
  return {
    description: expense.description,
    amount: centsToInputValue(expense.amountCents),
    category: expense.category,
    date: expense.date ?? '',
  };
}

export function expenseCategoryLabel(value) {
  return EXPENSE_CATEGORIES.find((option) => option.value === value)?.label ?? 'Other';
}

/** Name for headings and button labels: the description, or the category if there is none. */
export function expenseName(expense) {
  return expense.description || expenseCategoryLabel(expense.category);
}
