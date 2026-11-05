import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { PlusIcon } from '../../components/common/Icons.jsx';
import { buttonStyles } from '../../components/common/buttonStyles.js';
import BudgetSummary from '../../components/budget/BudgetSummary.jsx';
import BudgetForm from '../../components/budget/BudgetForm.jsx';
import BudgetForecast from '../../components/budget/BudgetForecast.jsx';
import CategoryBreakdown from '../../components/budget/CategoryBreakdown.jsx';
import ExpenseForm from '../../components/budget/ExpenseForm.jsx';
import ExpenseList from '../../components/budget/ExpenseList.jsx';
import { sectionCard } from '../../components/layout/layoutStyles.js';
import { useTrips } from '../../hooks/useTrips.js';
import {
  EMPTY_EXPENSE_VALUES,
  expenseName,
  expenseToValues,
  getBudgetForecast,
  getBudgetSummary,
  getCategoryBreakdown,
  sortExpenses,
} from '../../utils/budget.js';
import { centsToInputValue, formatMoney, toCents } from '../../utils/money.js';
import { todayIso } from '../../utils/dates.js';

function Section({ id, title, action, children }) {
  return (
    <section aria-labelledby={id} className={sectionCard}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-lg font-semibold text-fg">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function BudgetTab() {
  const { trip } = useOutletContext();
  const trips = useTrips();
  const [editingBudget, setEditingBudget] = useState(false);
  const [expenseForm, setExpenseForm] = useState(null); // { mode: 'add' } | { mode: 'edit', expense }
  const [deleting, setDeleting] = useState(null); // { expense, nextId }
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef(null);
  const pendingFocusId = useRef(undefined); // expense id, or null for the Add button

  // A deleted row's buttons disappear; move focus to the neighbouring row or the Add button.
  useEffect(() => {
    if (pendingFocusId.current === undefined || !rootRef.current) return;
    const id = pendingFocusId.current;
    const target = id
      ? rootRef.current.querySelector(`[data-expense-id="${id}"] [data-control="edit"]`)
      : rootRef.current.querySelector('[data-control="add-expense"]');
    target?.focus();
    pendingFocusId.current = undefined;
  });

  const summary = getBudgetSummary(trip);
  const forecast = getBudgetForecast(trip, todayIso());
  const breakdown = getCategoryBreakdown(trip.expenses);
  const expenses = sortExpenses(trip.expenses);
  const money = (cents) => formatMoney(cents, trip.currency);

  function saveBudget(values) {
    trips.setBudget(trip.id, values);
    const cents = toCents(values.total);
    setAnnouncement(
      cents > 0 ? `Budget set to ${formatMoney(cents, values.currency)}.` : 'Budget removed.',
    );
    setEditingBudget(false);
  }

  function saveExpense(values) {
    if (expenseForm.mode === 'add') {
      const expense = trips.addExpense(trip.id, values);
      setAnnouncement(`Added ${expenseName(expense)}: ${money(expense.amountCents)}.`);
    } else {
      trips.updateExpense(trip.id, expenseForm.expense, values);
      setAnnouncement(`Saved ${values.description.trim() || 'expense'}.`);
    }
    setExpenseForm(null);
  }

  function requestDelete(expense) {
    const index = expenses.indexOf(expense);
    const next = expenses[index + 1] ?? expenses[index - 1] ?? null;
    setDeleting({ expense, nextId: next?.id ?? null });
  }

  function confirmDelete() {
    pendingFocusId.current = deleting.nextId;
    trips.deleteExpense(trip.id, deleting.expense.id);
    setAnnouncement(`Deleted ${expenseName(deleting.expense)}.`);
    setDeleting(null);
  }

  return (
    <div ref={rootRef} className="grid gap-6">
      <p role="status" className="sr-only">
        {announcement}
      </p>

      <Section
        id="budget-summary-heading"
        title="Budget"
        action={
          <button
            type="button"
            className={`${buttonStyles.secondary} ${buttonStyles.small}`}
            onClick={() => setEditingBudget(true)}
          >
            {summary.hasBudget ? 'Edit budget' : 'Set budget'}
          </button>
        }
      >
        <BudgetSummary
          summary={summary}
          currency={trip.currency}
          showDailyBudget={forecast === null} // the forecast's allowance replaces it
        />
      </Section>

      {forecast && (
        <Section id="budget-forecast-heading" title="Budget forecast">
          <BudgetForecast forecast={forecast} currency={trip.currency} />
        </Section>
      )}

      {breakdown.length > 0 && (
        <Section id="budget-breakdown-heading" title="Spending by category">
          <CategoryBreakdown rows={breakdown} currency={trip.currency} />
        </Section>
      )}

      <Section
        id="budget-expenses-heading"
        title="Expenses"
        action={
          <button
            type="button"
            data-control="add-expense"
            className={`${buttonStyles.primary} ${buttonStyles.small}`}
            onClick={() => setExpenseForm({ mode: 'add' })}
          >
            <PlusIcon className="size-4" />
            Add expense
          </button>
        }
      >
        {expenses.length === 0 ? (
          <p className="text-fg-muted">
            No expenses yet. Add bookings, meals and tickets to track your spending.
          </p>
        ) : (
          <ExpenseList
            expenses={expenses}
            currency={trip.currency}
            onEdit={(expense) => setExpenseForm({ mode: 'edit', expense })}
            onDelete={requestDelete}
          />
        )}
      </Section>

      <Modal
        open={editingBudget}
        onClose={() => setEditingBudget(false)}
        title={summary.hasBudget ? 'Edit budget' : 'Set budget'}
      >
        {editingBudget && (
          <BudgetForm
            initialValues={{
              total: summary.hasBudget ? centsToInputValue(summary.budgetCents) : '',
              currency: trip.currency,
            }}
            onSubmit={saveBudget}
            onCancel={() => setEditingBudget(false)}
          />
        )}
      </Modal>

      <Modal
        open={expenseForm !== null}
        onClose={() => setExpenseForm(null)}
        title={
          expenseForm?.mode === 'edit' ? `Edit ${expenseName(expenseForm.expense)}` : 'Add expense'
        }
      >
        {expenseForm && (
          <ExpenseForm
            initialValues={
              expenseForm.mode === 'edit'
                ? expenseToValues(expenseForm.expense)
                : EMPTY_EXPENSE_VALUES
            }
            currency={trip.currency}
            submitLabel={expenseForm.mode === 'edit' ? 'Save expense' : 'Add expense'}
            onSubmit={saveExpense}
            onCancel={() => setExpenseForm(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `Delete ${expenseName(deleting.expense)}?` : ''}
        description={
          deleting
            ? `This removes ${money(deleting.expense.amountCents)} from your spending.`
            : undefined
        }
        confirmLabel="Delete expense"
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
