import { useRef, useState } from 'react';
import FormField from '../common/FormField.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { inputStyles } from '../common/formStyles.js';
import { ACTIVITY_CATEGORIES } from '../../utils/constants.js';
import { hasErrors, validateActivity } from '../../utils/validators.js';

const FIELD_ORDER = ['title', 'category', 'time', 'location', 'url', 'notes'];
const ALL_TOUCHED = Object.fromEntries(FIELD_ORDER.map((field) => [field, true]));

/** Add/edit form, shown inside a Modal. Title gets initial focus via data-autofocus. */
export default function ActivityForm({ initialValues, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const fieldRefs = useRef({});

  const errors = validateActivity(values);
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
      <FormField id="activity-title" label="Title" required error={visibleError('title')}>
        {(fieldProps) => (
          <input
            {...fieldProps}
            {...control('title')}
            type="text"
            data-autofocus
            autoComplete="off"
            placeholder="e.g. Louvre Museum"
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="activity-category"
          label="Category"
          required
          error={visibleError('category')}
        >
          {(fieldProps) => (
            <select {...fieldProps} {...control('category')}>
              {ACTIVITY_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField id="activity-time" label="Time" error={visibleError('time')}>
          {(fieldProps) => <input {...fieldProps} {...control('time')} type="time" />}
        </FormField>
      </div>

      <FormField id="activity-location" label="Location" error={visibleError('location')}>
        {(fieldProps) => (
          <input {...fieldProps} {...control('location')} type="text" autoComplete="off" />
        )}
      </FormField>

      <FormField
        id="activity-url"
        label="Link"
        hint="Tickets, booking or website."
        error={visibleError('url')}
      >
        {(fieldProps) => (
          <input
            {...fieldProps}
            {...control('url')}
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://"
          />
        )}
      </FormField>

      <FormField id="activity-notes" label="Notes" error={visibleError('notes')}>
        {(fieldProps) => <textarea {...fieldProps} {...control('notes')} rows={3} />}
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
