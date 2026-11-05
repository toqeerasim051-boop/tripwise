import { useRef, useState } from 'react';
import FormField from '../common/FormField.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { inputStyles } from '../common/formStyles.js';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';
import { hasErrors, validateExpense } from '../../utils/validators.js';

const FIELD_ORDER = ['amount', 'category', 'description', 'date'];
const ALL_TOUCHED = Object.fromEntries(FIELD_ORDER.map((field) => [field, true]));

/** Add/edit expense form, shown inside a Modal. Amount gets initial focus. */
export default function ExpenseForm({ initialValues, currency, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const fieldRefs = useRef({});

  const errors = validateExpense(values);
  const visibleError = (field) => (touched[field] ? errors[field] : undefined);
  const control = (field) => ({
    ref: (element) => {
      fieldRefs.current[field] = element;
    },
    value: values[field],
    onChange: (event) => setValues((previous) => ({ ...previous, [field]: event.target.value })),
    onBlur: () => setTouched((previous) => ({ ...previous, [field]: true })),
    className: inputStyles,
  });

  function handleSubmit(event) {
    event.preventDefault();
    if (hasErrors(errors)) {
      setTouched(ALL_TOUCHED);
      fieldRefs.current[FIELD_ORDER.find((field) => errors[field])]?.focus();
      return;
    }
    onSubmit(values);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-4 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="expense-amount"
          label={`Amount (${currency})`}
          required
          error={visibleError('amount')}
        >
          {(fieldProps) => (
            <input
              {...fieldProps}
              {...control('amount')}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              data-autofocus
            />
          )}
        </FormField>
        <FormField id="expense-category" label="Category" required error={visibleError('category')}>
          {(fieldProps) => (
            <select {...fieldProps} {...control('category')}>
              {EXPENSE_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>
      <FormField id="expense-description" label="Description" error={visibleError('description')}>
        {(fieldProps) => (
          <input
            {...fieldProps}
            {...control('description')}
            type="text"
            autoComplete="off"
            placeholder="e.g. Hotel deposit"
          />
        )}
      </FormField>
      <FormField id="expense-date" label="Date" error={visibleError('date')}>
        {(fieldProps) => <input {...fieldProps} {...control('date')} type="date" />}
      </FormField>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={buttonStyles.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={buttonStyles.primary}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
