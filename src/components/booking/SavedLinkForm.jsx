import { useRef, useState } from 'react';
import FormField from '../common/FormField.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { inputStyles } from '../common/formStyles.js';
import { LINK_TYPES } from '../../utils/constants.js';
import { hasErrors, validateSavedLink } from '../../utils/validators.js';

const FIELD_ORDER = ['type', 'label', 'url'];
const ALL_TOUCHED = Object.fromEntries(FIELD_ORDER.map((field) => [field, true]));

/** Add/edit saved link, shown inside a Modal. Label gets initial focus. */
export default function SavedLinkForm({ initialValues, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const fieldRefs = useRef({});

  const errors = validateSavedLink(values);
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
      <FormField id="link-label" label="Label" required error={visibleError('label')}>
        {(fieldProps) => (
          <input
            {...fieldProps}
            {...control('label')}
            type="text"
            data-autofocus
            autoComplete="off"
            placeholder="e.g. Hotel confirmation"
          />
        )}
      </FormField>
      <FormField id="link-type" label="Type" required error={visibleError('type')}>
        {(fieldProps) => (
          <select {...fieldProps} {...control('type')}>
            {LINK_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <FormField
        id="link-url"
        label="Web address"
        required
        hint="Only http:// and https:// links are allowed."
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
