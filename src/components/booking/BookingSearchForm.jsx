import { useRef, useState } from 'react';
import FormField from '../common/FormField.jsx';
import SegmentedControl from '../common/SegmentedControl.jsx';
import {
  ExternalLinkIcon,
  HotelIcon,
  PlaneIcon,
  SearchIcon,
  TicketIcon,
} from '../common/Icons.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { inputStyles } from '../common/formStyles.js';
import { buildSearchUrl, getSearchProvider } from '../../utils/bookingLinks.js';
import { validateBookingSearch } from '../../utils/validators.js';

const TYPES = [
  { value: 'hotel', label: 'Hotels', Icon: HotelIcon },
  { value: 'flight', label: 'Flights', Icon: PlaneIcon },
  { value: 'activity', label: 'Activities', Icon: TicketIcon },
];

// Fields per search type, in order, with their labels. Each provider uses only these.
const FIELDS = {
  hotel: [
    ['where', 'Destination'],
    ['checkIn', 'Check-in'],
    ['checkOut', 'Check-out'],
    ['adults', 'Adults'],
    ['rooms', 'Rooms'],
  ],
  flight: [
    ['from', 'From'],
    ['where', 'To'],
    ['checkIn', 'Depart'],
    ['checkOut', 'Return'],
  ],
  activity: [['where', 'Destination']],
};

// Fields that take two of the six columns on large screens, so each type fills one row.
const WIDE = { hotel: ['where'], flight: ['from', 'where'], activity: ['where'] };

const REQUIRED = new Set(['where', 'adults', 'rooms']);
const HINTS = { where: 'A city gives better results.', from: 'Your city or airport.' };

function inputProps(name, today) {
  if (name === 'checkIn' || name === 'checkOut') return { type: 'date', min: today };
  if (name === 'adults' || name === 'rooms') {
    return { type: 'number', min: 1, max: 30, inputMode: 'numeric' };
  }
  return { type: 'text', autoComplete: 'off', maxLength: 100 };
}

/**
 * One search form for hotels, flights and activities. Values are controlled by the parent
 * (filled in from the trip); a valid search opens the provider's site in a new tab.
 */
export default function BookingSearchForm({ type, values, onTypeChange, onChange, today, hint }) {
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const provider = getSearchProvider(type);
  const typeLabel = TYPES.find((option) => option.value === type).label.toLowerCase();

  function changeType(next) {
    setErrors({});
    onTypeChange(next);
  }

  // After a field was flagged, re-check it when the user leaves it.
  function handleBlur(name) {
    if (!errors[name]) return;
    const { [name]: error } = validateBookingSearch(type, values, today);
    setErrors((current) => ({ ...current, [name]: error }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const found = validateBookingSearch(type, values, today);
    setErrors(found);
    const firstInvalid = FIELDS[type].find(([name]) => found[name]);
    if (firstInvalid) {
      formRef.current.querySelector(`#booking-${firstInvalid[0]}`)?.focus();
      return;
    }
    window.open(buildSearchUrl(type, values), '_blank', 'noopener,noreferrer');
  }

  return (
    <form ref={formRef} noValidate onSubmit={handleSubmit} className="grid gap-5">
      <SegmentedControl
        legend="What to search"
        hideLegend
        name="booking-type"
        options={TYPES}
        value={type}
        onChange={changeType}
      />
      {type !== 'activity' && <p className="-mt-2 text-sm text-fg-muted">{hint}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {FIELDS[type].map(([name, label]) => (
          <div key={name} className={WIDE[type].includes(name) ? 'lg:col-span-2' : ''}>
            <FormField
              id={`booking-${name}`}
              label={label}
              hint={HINTS[name]}
              error={errors[name]}
              required={REQUIRED.has(name)}
            >
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  {...inputProps(name, today)}
                  value={values[name]}
                  onChange={(event) => onChange({ ...values, [name]: event.target.value })}
                  onBlur={() => handleBlur(name)}
                  className={inputStyles}
                />
              )}
            </FormField>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" className={buttonStyles.primary}>
          <SearchIcon className="size-4" />
          <span>
            Search {typeLabel} on {provider.provider}{' '}
            <span className="sr-only">(opens external site)</span>
          </span>
          <ExternalLinkIcon className="size-3.5" />
        </button>
        <p className="text-sm text-fg-muted">
          Opens {provider.provider} in a new tab. You book and pay there.
        </p>
      </div>
    </form>
  );
}
