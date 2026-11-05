import { SearchIcon } from '../common/Icons.jsx';
import { inputStyles, labelStyles } from '../common/formStyles.js';
import { POPULATION_RANGES, SORT_OPTIONS } from '../../utils/countryFilters.js';

function SelectField({ id, label, value, options, onChange }) {
  return (
    <div>
      <label htmlFor={id} className={labelStyles}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputStyles}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Search, region, population and sort controls. `onChange(name, value)` reports edits. */
export default function CountryFilters({ query, filters, regions, onChange }) {
  const regionOptions = [
    { value: 'all', label: 'All regions' },
    ...regions.map((region) => ({ value: region, label: region })),
  ];

  return (
    <form
      role="search"
      aria-label="Filter countries"
      onSubmit={(event) => event.preventDefault()}
      className="mb-4 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]"
    >
      <div className="sm:col-span-2 lg:col-span-1">
        <label htmlFor="country-search" className={labelStyles}>
          Search
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted" />
          <input
            id="country-search"
            type="search"
            value={query}
            onChange={(event) => onChange('query', event.target.value)}
            placeholder="Country, capital or code"
            autoComplete="off"
            spellCheck="false"
            className={`${inputStyles} pl-9`}
          />
        </div>
      </div>
      <SelectField
        id="country-region"
        label="Region"
        value={filters.region}
        options={regionOptions}
        onChange={(value) => onChange('region', value)}
      />
      <SelectField
        id="country-population"
        label="Population"
        value={filters.population}
        options={POPULATION_RANGES}
        onChange={(value) => onChange('population', value)}
      />
      <SelectField
        id="country-sort"
        label="Sort by"
        value={filters.sort}
        options={SORT_OPTIONS}
        onChange={(value) => onChange('sort', value)}
      />
    </form>
  );
}
