import { useMemo, useRef, useState } from 'react';
import FormField from '../common/FormField.jsx';
import ErrorState from '../common/ErrorState.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { inputStyles } from '../common/formStyles.js';
import { hasErrors, validateTrip } from '../../utils/validators.js';
import { defaultCurrencyFor } from '../../utils/tripModel.js';

const FIELD_ORDER = ['countryCode', 'title', 'startDate', 'endDate'];
const ALL_TOUCHED = Object.fromEntries(FIELD_ORDER.map((field) => [field, true]));

/**
 * Create/edit form for trip details. Errors show after a field is blurred or on submit; on an
 * invalid submit, focus moves to the first invalid field.
 *
 * - countries: { status, data, error, retry } from useCountries()
 * - currentDestination: { code, name } of the saved trip (edit mode) so it stays selectable even
 *   when the country list can't load
 * - lockedCurrency: the saved trip's currency (edit mode); new trips derive it from the destination
 */
export default function TripForm({
  initialValues,
  countries,
  currentDestination = null,
  lockedCurrency = null,
  submitLabel,
  onSubmit,
  cancelAction,
}) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const fieldRefs = useRef({});

  const options = useMemo(() => {
    const list = countries.data ?? [];
    if (currentDestination && !list.some((country) => country.code === currentDestination.code)) {
      return [...list, currentDestination];
    }
    return list;
  }, [countries.data, currentDestination]);
  const selectedCountry = options.find((country) => country.code === values.countryCode) ?? null;

  const errors = { ...validateTrip(values) };
  const listReady = countries.status === 'success' || currentDestination;
  if (!errors.countryCode && listReady && !selectedCountry) {
    errors.countryCode = 'Choose a destination from the list.';
  }
  const visibleError = (field) => (touched[field] ? errors[field] : undefined);

  const setValue = (field) => (event) =>
    setValues((previous) => ({ ...previous, [field]: event.target.value }));
  const markTouched = (field) => () => setTouched((previous) => ({ ...previous, [field]: true }));
  const register = (field) => (element) => {
    fieldRefs.current[field] = element;
  };

  function handleSubmit(event) {
    event.preventDefault();
    if (hasErrors(errors)) {
      setTouched(ALL_TOUCHED);
      const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    onSubmit({ ...values, title: values.title.trim() });
  }

  const currency = lockedCurrency ?? (selectedCountry ? defaultCurrencyFor(selectedCountry) : null);
  const destinationHint = currency
    ? lockedCurrency
      ? `Budget currency: ${currency}. Changing the destination keeps it.`
      : `Budget currency: ${currency}.`
    : undefined;

  return (
    <form noValidate onSubmit={handleSubmit} className="grid max-w-2xl gap-5">
      <FormField
        id="trip-destination"
        label="Destination"
        required
        hint={destinationHint}
        error={visibleError('countryCode')}
      >
        {(fieldProps) => (
          <select
            {...fieldProps}
            ref={register('countryCode')}
            value={selectedCountry ? values.countryCode : ''}
            onChange={setValue('countryCode')}
            onBlur={markTouched('countryCode')}
            disabled={countries.status === 'loading' && !currentDestination}
            className={inputStyles}
          >
            <option value="">
              {countries.status === 'loading' && !currentDestination
                ? 'Loading destinations…'
                : 'Choose a destination'}
            </option>
            {options.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        )}
      </FormField>
      {countries.status === 'error' && (
        <ErrorState
          compact
          title="Couldn't load the list of destinations"
          error={countries.error}
          onRetry={countries.retry}
        />
      )}

      <FormField id="trip-title" label="Trip name" required error={visibleError('title')}>
        {(fieldProps) => (
          <input
            {...fieldProps}
            ref={register('title')}
            type="text"
            value={values.title}
            onChange={setValue('title')}
            onBlur={markTouched('title')}
            placeholder={
              selectedCountry ? `e.g. Summer in ${selectedCountry.name}` : 'e.g. Summer in Italy'
            }
            autoComplete="off"
            className={inputStyles}
          />
        )}
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="trip-start" label="Start date" required error={visibleError('startDate')}>
          {(fieldProps) => (
            <input
              {...fieldProps}
              ref={register('startDate')}
              type="date"
              value={values.startDate}
              onChange={setValue('startDate')}
              onBlur={markTouched('startDate')}
              className={inputStyles}
            />
          )}
        </FormField>
        <FormField id="trip-end" label="End date" required error={visibleError('endDate')}>
          {(fieldProps) => (
            <input
              {...fieldProps}
              ref={register('endDate')}
              type="date"
              value={values.endDate}
              min={values.startDate || undefined}
              onChange={setValue('endDate')}
              onBlur={markTouched('endDate')}
              className={inputStyles}
            />
          )}
        </FormField>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={buttonStyles.primary}>
          {submitLabel}
        </button>
        {cancelAction}
      </div>
    </form>
  );
}
