import { useState } from 'react';
import { SearchIcon, SlidersIcon } from '../common/Icons.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { POPULATION_RANGES } from '../../utils/countryFilters.js';

const fieldStyles =
  'w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-fg hover:border-fg-muted';

/**
 * Hero search bar: text search, region and population. Filters apply as you type; "Search"
 * (or Enter) calls `onSubmit`, which moves to the results. Labels are visually hidden because
 * each control shows its purpose (placeholder / current value), as in the design.
 * On phones the two selects sit behind a "Filters" button, so the bar stays short.
 */
export default function CountrySearchBar({ query, filters, regions, onChange, onSubmit }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount = (filters.region !== 'all' ? 1 : 0) + (filters.population !== 'any' ? 1 : 0);
  const selectWrapper = `${filtersOpen ? '' : 'hidden'} col-span-2 sm:col-span-1 sm:block`;

  return (
    <form
      id="explore-search"
      role="search"
      aria-label="Filter countries"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="grid scroll-mt-20 grid-cols-2 gap-2 rounded-2xl bg-surface p-2 shadow-xl lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
    >
      <div className="relative col-span-2 lg:col-span-1">
        <label htmlFor="country-search" className="sr-only">
          Search
        </label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-fg-muted" />
        <input
          id="country-search"
          type="search"
          value={query}
          onChange={(event) => onChange('query', event.target.value)}
          placeholder="Search for a country, capital or code…"
          autoComplete="off"
          spellCheck="false"
          className={`${fieldStyles} pl-11`}
        />
      </div>
      <div className={selectWrapper}>
        <label htmlFor="country-region" className="sr-only">
          Region
        </label>
        <select
          id="country-region"
          value={filters.region}
          onChange={(event) => onChange('region', event.target.value)}
          className={fieldStyles}
        >
          <option value="all">All regions</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>
      <div className={selectWrapper}>
        <label htmlFor="country-population" className="sr-only">
          Population
        </label>
        <select
          id="country-population"
          value={filters.population}
          onChange={(event) => onChange('population', event.target.value)}
          className={fieldStyles}
        >
          {POPULATION_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        aria-expanded={filtersOpen}
        aria-controls="country-region country-population"
        onClick={() => setFiltersOpen((open) => !open)}
        className={`${buttonStyles.secondary} rounded-xl py-2.5 sm:hidden`}
      >
        <SlidersIcon className="size-4" />
        <span>
          Filters
          {activeCount > 0 && (
            <>
              {' '}
              <span className="sr-only">({activeCount} active)</span>
            </>
          )}
        </span>
        {activeCount > 0 && (
          <span
            aria-hidden="true"
            className="rounded-full bg-primary px-1.5 text-xs font-semibold text-on-primary"
          >
            {activeCount}
          </span>
        )}
      </button>
      <button
        type="submit"
        className={`${buttonStyles.primary} rounded-xl py-2.5 sm:col-span-2 lg:col-span-1`}
      >
        <SearchIcon className="size-4" />
        Search
      </button>
    </form>
  );
}
