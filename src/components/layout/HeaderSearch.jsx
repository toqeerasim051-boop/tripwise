import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { SearchIcon } from '../common/Icons.jsx';
import { getCuratedCountries, getDestinations } from '../../services/attractions.js';
import { filterAndSortCountries, normalizeSearchText } from '../../utils/countryFilters.js';

const MAX_SUGGESTIONS = 6;

/**
 * Curated destinations matching the query (no request). Names starting with it come first, then
 * names containing it, then other matches (capital, code, official name).
 */
function getSuggestions(query) {
  const text = normalizeSearchText(query);
  if (!text) return [];
  const matches = filterAndSortCountries(
    getCuratedCountries(),
    { query },
    { featuredOrder: getDestinations().featured },
  );
  const rank = (country) => {
    const name = normalizeSearchText(country.name);
    if (name.startsWith(text)) return 0;
    return name.includes(text) ? 1 : 2;
  };
  // Array sort is stable, so each group keeps the featured order.
  return matches.sort((a, b) => rank(a) - rank(b)).slice(0, MAX_SUGGESTIONS);
}

/** The country name with the typed part in bold (case-insensitive; no highlight if not found). */
function HighlightedName({ name, query }) {
  const start = name.toLowerCase().indexOf(query.trim().toLowerCase());
  if (start === -1 || !query.trim()) return name;
  const end = start + query.trim().length;
  return (
    <>
      {name.slice(0, start)}
      <mark className="bg-transparent font-bold text-primary">{name.slice(start, end)}</mark>
      {name.slice(end)}
    </>
  );
}

const optionClass = (active) =>
  `flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm ${active ? 'bg-primary-soft' : 'hover:bg-surface-muted'}`;

/**
 * Compact country search for the header (an ARIA combobox). While typing, a box lists matching
 * destinations; choosing one opens its country page. The last option (or Enter with nothing
 * chosen) opens Explore with the query (`state.headerSearch` tells Explore to take it over).
 */
export default function HeaderSearch({ autoFocus = false, onSearch }) {
  const id = useId();
  const listId = `${id}-list`;
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = getSuggestions(value);
  const query = value.trim();
  const showList = open && query !== '';
  const optionCount = suggestions.length + 1; // + "Search all countries"
  const optionId = (index) => `${id}-option-${index}`;

  function finish(to, options) {
    navigate(to, options);
    setValue('');
    setOpen(false);
    setActiveIndex(-1);
    onSearch?.();
  }

  function searchAll() {
    finish(query ? `/?${new URLSearchParams({ q: query })}` : '/', {
      state: { headerSearch: true },
    });
  }

  function choose(index) {
    if (index < suggestions.length) finish(`/countries/${suggestions[index].code}`);
    else searchAll();
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!query) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => Math.min(optionCount - 1, Math.max(-1, index + step)));
    } else if (event.key === 'Escape' && showList) {
      event.stopPropagation(); // close the box first, not the phone search row
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <form
      role="search"
      aria-label="Search countries"
      onSubmit={(event) => {
        event.preventDefault();
        if (showList && activeIndex >= 0) choose(activeIndex);
        else searchAll();
      }}
      className="relative"
    >
      <label htmlFor={id} className="sr-only">
        Search countries
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-muted" />
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder="Search countries…"
        autoComplete="off"
        spellCheck="false"
        // Only when the user opened the search on purpose (the phone search button).
        autoFocus={autoFocus}
        className="w-full rounded-full border border-line-strong bg-surface-muted py-2 pr-4 pl-10 text-sm text-fg placeholder:text-fg-muted hover:border-fg-muted"
      />
      <p aria-live="polite" className="sr-only">
        {showList ? `${suggestions.length} matching destinations` : ''}
      </p>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching destinations"
          // Keep focus in the input while clicking an option.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute top-full right-0 left-0 z-50 mt-2 grid gap-0.5 rounded-2xl border border-line bg-surface p-1.5 shadow-card-hover sm:left-auto sm:w-[min(24rem,calc(100vw-2rem))]"
        >
          {suggestions.length === 0 && (
            <li role="presentation" className="px-3 py-2 text-sm text-fg-muted">
              No top destinations match. Try all countries:
            </li>
          )}
          {suggestions.map((country, index) => (
            <li
              key={country.code}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => choose(index)}
              className={optionClass(index === activeIndex)}
            >
              <img
                src={country.flagUrl}
                alt=""
                loading="lazy"
                className="size-7 shrink-0 rounded-full border border-line object-cover"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-fg">
                  <HighlightedName name={country.name} query={value} />
                </span>
                <span className="block truncate text-xs text-fg-muted">
                  {[country.capital, country.region].filter(Boolean).join(' · ')}
                </span>
              </span>
            </li>
          ))}
          <li
            id={optionId(suggestions.length)}
            role="option"
            aria-selected={activeIndex === suggestions.length}
            onClick={searchAll}
            className={`${optionClass(activeIndex === suggestions.length)} border-t border-line text-primary`}
          >
            <SearchIcon className="size-4" />
            <span className="min-w-0 truncate font-medium">Search all countries for “{query}”</span>
          </li>
        </ul>
      )}
    </form>
  );
}
