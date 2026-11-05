import { useMemo, useRef, useState } from 'react';
import FormField from '../common/FormField.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { inputStyles } from '../common/formStyles.js';
import { getCurrencyOptions } from '../../utils/currencies.js';
import { hasErrors, validateBudget } from '../../utils/validators.js';

/** Total budget + currency, shown inside a Modal. */
export default function BudgetForm({ initialValues, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const totalRef = useRef(null);
  const currencies = useMemo(() => getCurrencyOptions(initialValues.currency), [initialValues]);

  const errors = validateBudget(values);
  const visibleError = (field) => (touched[field] ? errors[field] : undefined);
  const currencyChanged = values.currency !== initialValues.currency;

  function handleSubmit(event) {
    event.preventDefault();
    if (hasErrors(errors)) {
      setTouched({ total: true, currency: true });
      totalRef.current?.focus();
      return;
    }
    onSubmit(values);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-4 grid gap-4">
      <FormField
        id="budget-total"
        label={`Total budget (${values.currency})`}
        required
        hint="Enter 0 to remove the budget."
        error={visibleError('total')}
      >
        {(fieldProps) => (
          <input
            {...fieldProps}
            ref={totalRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            data-autofocus
            value={values.total}
            onChange={(event) =>
              setValues((previous) => ({ ...previous, total: event.target.value }))
            }
            onBlur={() => setTouched((previous) => ({ ...previous, total: true }))}
            className={inputStyles}
          />
        )}
      </FormField>
      <FormField
        id="budget-currency"
        label="Currency"
        required
        hint={
          currencyChanged
            ? `Existing amounts will be shown in ${values.currency} without conversion.`
            : 'Amounts are never converted between currencies.'
        }
        error={visibleError('currency')}
      >
        {(fieldProps) => (
          <select
            {...fieldProps}
            value={values.currency}
            onChange={(event) =>
              setValues((previous) => ({ ...previous, currency: event.target.value }))
            }
            className={inputStyles}
          >
            {currencies.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={buttonStyles.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={buttonStyles.primary}>
          Save budget
        </button>
      </div>
    </form>
  );
}
