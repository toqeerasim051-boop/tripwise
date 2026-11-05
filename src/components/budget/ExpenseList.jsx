import { buttonStyles } from '../common/buttonStyles.js';
import { formatMoney } from '../../utils/money.js';
import { formatDate } from '../../utils/dates.js';
import { expenseCategoryLabel as categoryLabel, expenseName } from '../../utils/budget.js';

const small = buttonStyles.small;

/** Expense rows. `data-expense-id` / `data-control` let the tab restore focus after a delete. */
export default function ExpenseList({ expenses, currency, onEdit, onDelete }) {
  return (
    <ul role="list" className="divide-y divide-line rounded-xl border border-line bg-surface">
      {expenses.map((expense) => {
        const name = expenseName(expense);
        return (
          <li
            key={expense.id}
            data-expense-id={expense.id}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
          >
            <div className="min-w-0">
              <p className="font-medium wrap-break-word text-fg">{name}</p>
              <p className="text-sm text-fg-muted">
                {categoryLabel(expense.category)}
                {expense.date && (
                  <>
                    {' · '}
                    <time dateTime={expense.date}>{formatDate(expense.date)}</time>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="font-semibold text-fg tabular-nums">
                {formatMoney(expense.amountCents, currency)}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  data-control="edit"
                  className={`${buttonStyles.secondary} ${small}`}
                  onClick={() => onEdit(expense)}
                >
                  Edit <span className="sr-only">{name}</span>
                </button>
                <button
                  type="button"
                  data-control="delete"
                  className={`${buttonStyles.dangerGhost} ${small}`}
                  onClick={() => onDelete(expense)}
                >
                  Delete <span className="sr-only">{name}</span>
                </button>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
