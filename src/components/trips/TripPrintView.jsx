import {
  expenseCategoryLabel,
  expenseName,
  getBudgetSummary,
  getCategoryBreakdown,
  sortExpenses,
} from '../../utils/budget.js';
import { formatDate, formatDateRange, tripLengthInDays, todayIso } from '../../utils/dates.js';
import { pluralize } from '../../utils/formatters.js';
import { activityCategoryLabel, dayLabel } from '../../utils/itinerary.js';
import { formatMoney } from '../../utils/money.js';
import { linkTypeLabel } from '../../utils/savedLinks.js';

function Heading({ children }) {
  return (
    <h3 className="mt-8 mb-3 border-b border-line pb-1 font-display text-xl font-bold">
      {children}
    </h3>
  );
}

/**
 * Plain, printable summary of a trip (itinerary, budget, saved links), shown only while the
 * browser prints (TripLayout renders it on `beforeprint`). Print styles: index.css.
 */
export default function TripPrintView({ trip }) {
  const money = (cents) => formatMoney(cents, trip.currency);
  const summary = getBudgetSummary(trip);
  const breakdown = getCategoryBreakdown(trip.expenses);
  const length = tripLengthInDays(trip.startDate, trip.endDate);

  return (
    <article aria-label={`Printable summary of ${trip.title}`} className="text-fg">
      <header>
        <p className="text-sm text-fg-muted">TripWise trip plan</p>
        <h2 className="font-display text-3xl font-bold">{trip.title}</h2>
        <p className="mt-1">
          {trip.destinationName} · {formatDateRange(trip.startDate, trip.endDate)}
          {length ? ` · ${pluralize(length, 'day')}` : ''}
        </p>
      </header>

      <Heading>Itinerary</Heading>
      <ol className="grid gap-4">
        {trip.days.map((day, index) => (
          <li key={day.id} className="break-inside-avoid">
            <p className="font-semibold">
              {dayLabel(index)} ·{' '}
              {formatDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {day.notes && <p className="mt-1 text-sm whitespace-pre-line">{day.notes}</p>}
            {day.activities.length === 0 ? (
              <p className="mt-1 text-sm text-fg-muted">Nothing planned.</p>
            ) : (
              <ul className="mt-1 grid gap-1 text-sm">
                {day.activities.map((activity) => (
                  <li key={activity.id}>
                    <span className="inline-block w-14 font-semibold tabular-nums">
                      {activity.time ?? '–'}
                    </span>
                    {activity.title}
                    <span className="text-fg-muted">
                      {' '}
                      ({activityCategoryLabel(activity.category)})
                      {activity.location && ` · ${activity.location}`}
                    </span>
                    {activity.notes && (
                      <p className="ml-14 whitespace-pre-line text-fg-muted">{activity.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      <Heading>Budget</Heading>
      {summary.hasBudget ? (
        <p>
          Budget {money(summary.budgetCents)} · Spent {money(summary.spentCents)} ·{' '}
          {summary.remainingCents < 0
            ? `Over budget by ${money(-summary.remainingCents)}`
            : `Remaining ${money(summary.remainingCents)}`}
        </p>
      ) : (
        <p>No budget set. Spent {money(summary.spentCents)}.</p>
      )}
      {breakdown.length > 0 && (
        <ul className="mt-2 text-sm">
          {breakdown.map((row) => (
            <li key={row.category}>
              {row.label}: {money(row.cents)} ({Math.round(row.share * 100)}%)
            </li>
          ))}
        </ul>
      )}
      {trip.expenses.length > 0 && (
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="py-1 font-semibold">Date</th>
              <th className="py-1 font-semibold">Expense</th>
              <th className="py-1 font-semibold">Category</th>
              <th className="py-1 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sortExpenses(trip.expenses).map((expense) => (
              <tr key={expense.id} className="border-b border-line">
                <td className="py-1">{expense.date ? formatDate(expense.date) : '–'}</td>
                <td className="py-1">{expenseName(expense)}</td>
                <td className="py-1">{expenseCategoryLabel(expense.category)}</td>
                <td className="py-1 text-right tabular-nums">{money(expense.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {trip.savedLinks.length > 0 && (
        <>
          <Heading>Saved links</Heading>
          <ul className="grid gap-1 text-sm">
            {trip.savedLinks.map((link) => (
              <li key={link.id}>
                <span className="font-semibold">{link.label}</span> ({linkTypeLabel(link.type)}):{' '}
                <span className="break-all">{link.url}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-10 text-xs text-fg-muted">
        Planned with TripWise · printed {formatDate(todayIso())}
      </p>
    </article>
  );
}
