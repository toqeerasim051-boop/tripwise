import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import Reveal from '../components/common/Reveal.jsx';
import { SparklesIcon } from '../components/common/Icons.jsx';
import { buttonStyles } from '../components/common/buttonStyles.js';
import { pageContainer } from '../components/layout/layoutStyles.js';
import ExploreHero from '../components/countries/ExploreHero.jsx';
import CountrySearchBar from '../components/countries/CountrySearchBar.jsx';
import RegionChips from '../components/countries/RegionChips.jsx';
import WhyTripWise from '../components/countries/WhyTripWise.jsx';
import FamousPlaces from '../components/home/FamousPlaces.jsx';
import HowItWorks from '../components/home/HowItWorks.jsx';
import StatsBand from '../components/home/StatsBand.jsx';
import CallToAction from '../components/home/CallToAction.jsx';
import CountryCard from '../components/countries/CountryCard.jsx';
import CountryGrid, { CountryGridSkeleton } from '../components/countries/CountryGrid.jsx';
import { useCountries } from '../hooks/useCountries.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { getCoverPhoto, getCuratedCountries, getDestinations } from '../services/attractions.js';
import { pluralize } from '../utils/formatters.js';
import {
  DEFAULT_FILTERS,
  SORT_OPTIONS,
  filterAndSortCountries,
  getRegions,
  hasActiveFilters,
  sanitizeFilters,
} from '../utils/countryFilters.js';

// Filter name -> URL search param. Filters live in the URL so Back from a country keeps them.
const PARAMS = { query: 'q', region: 'region', population: 'pop', sort: 'sort' };

const getCode = (country) => country.code;
// Smooth scrolling, except for people who asked their system for less motion.
const scrollBehavior = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
// Cards per "page": fewer on phones (one column, below the 600px breakpoint).
const PAGE_SIZE = 10;
const PAGE_SIZE_MOBILE = 6;
const TOP_PICKS = 5;
const FAMOUS_PLACES = 12;

/** One famous place per featured country (its cover photo), for the home-page carousel. */
function getFamousPlaces(featured, countries) {
  const names = new Map(countries.map((country) => [country.code, country.name]));
  return featured
    .map((code) => ({ code, cover: getCoverPhoto(code), country: names.get(code) }))
    .filter((place) => place.cover && place.country)
    .slice(0, FAMOUS_PLACES)
    .map(({ code, cover, country }) => ({ code, name: cover.name, country, src: cover.src }));
}

const isBlank = (value) => value.trim() === '';

export default function ExplorePage() {
  useDocumentTitle('Explore destinations');
  const [searchParams, setSearchParams] = useSearchParams();
  const resultsHeadingRef = useRef(null);
  const gridRef = useRef(null);
  const pendingFocusIndex = useRef(null);
  const { featured } = getDestinations();
  // Only the first few featured destinations get the "Top pick" badge, so it stays meaningful.
  const topPicks = useMemo(() => new Set(featured.slice(0, TOP_PICKS)), [featured]);

  // The input is local state so typing never waits on a navigation; the URL is updated alongside.
  const [query, setQuery] = useState(() => searchParams.get(PARAMS.query) ?? '');
  // Clearing applies instantly, and the old text can't come back while the next query debounces.
  const appliedQuery = useDebounce(query, 300, { flushWhen: isBlank });

  // A search from the header (HeaderSearch) arrives as a new location: take its query over
  // (adjusting state during render, not in an effect) and then move to the results.
  const location = useLocation();
  const [headerSearchKey, setHeaderSearchKey] = useState(null);
  if (location.state?.headerSearch && location.key !== headerSearchKey) {
    setHeaderSearchKey(location.key);
    setQuery(searchParams.get(PARAMS.query) ?? '');
  }
  useEffect(() => {
    if (!headerSearchKey) return undefined;
    // After the route-change focus (useRouteFocus runs in the parent, after this effect).
    const frame = requestAnimationFrame(showResults);
    return () => cancelAnimationFrame(frame);
  }, [headerSearchKey]);

  // Browsing lists the curated destinations from a bundled snapshot, with no request. Only a
  // search loads the full country list (once per session), so a trip can go anywhere.
  const isSearching = appliedQuery.trim() !== '';
  const curatedCountries = getCuratedCountries();
  const { data: countries, status: listStatus, error, retry } = useCountries(isSearching);
  const status = isSearching ? listStatus : 'success';
  const regions = useMemo(() => getRegions(curatedCountries), [curatedCountries]);
  const filters = sanitizeFilters(
    {
      query: appliedQuery,
      region: searchParams.get(PARAMS.region),
      population: searchParams.get(PARAMS.population),
      sort: searchParams.get(PARAMS.sort),
    },
    regions,
  );

  const pool = isSearching ? countries : curatedCountries;
  const results = useMemo(
    () =>
      pool
        ? filterAndSortCountries(
            pool,
            {
              query: filters.query,
              region: filters.region,
              population: filters.population,
              sort: filters.sort,
            },
            { featuredOrder: featured },
          )
        : [],
    [pool, filters.query, filters.region, filters.population, filters.sort, featured],
  );

  function updateParams(changes) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(changes).forEach(([name, value]) => {
          const isDefault = value === DEFAULT_FILTERS[name] || value === '';
          if (isDefault) next.delete(PARAMS[name]);
          else next.set(PARAMS[name], value);
        });
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }

  // "Search" / Enter: move to the results heading (below the sticky header, via scroll-mt).
  function showResults() {
    const heading = resultsHeadingRef.current;
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView?.({ block: 'start', behavior: scrollBehavior() });
  }

  // While typing, lift the hero search bar to just under the header, so the matching countries
  // show right below it and the input stays in view. Does nothing once it is already there.
  function bringSearchToTop() {
    const form = document.getElementById('explore-search');
    const headerHeight = document.querySelector('header')?.offsetHeight ?? 0;
    if (!form || Math.abs(form.getBoundingClientRect().top - (headerHeight + 16)) <= 24) return;
    form.scrollIntoView?.({ block: 'start', behavior: scrollBehavior() });
  }

  function handleFilterChange(name, value) {
    if (name === 'query') {
      setQuery(value);
      if (value.trim()) bringSearchToTop();
    }
    updateParams({ [name]: value });
  }

  function clearFilters() {
    setQuery('');
    updateParams({
      query: '',
      region: DEFAULT_FILTERS.region,
      population: DEFAULT_FILTERS.population,
    });
  }

  // Passed to country links so "Back to Explore" restores the same filters.
  const linkState = useMemo(() => ({ exploreSearch: `?${searchParams}` }), [searchParams]);
  const isFeaturedView = filters.sort === 'featured' && !hasActiveFilters(filters);

  // Show results in pages; any filter or sort change starts again from the first page (derived,
  // so no state is set in an effect).
  const filterKey = [filters.query, filters.region, filters.population, filters.sort].join('|');
  const pageSize = useMediaQuery('(max-width: 599px)') ? PAGE_SIZE_MOBILE : PAGE_SIZE;
  const [page, setPage] = useState({ key: filterKey, pages: 1 });
  const pages = page.key === filterKey ? page.pages : 1;
  const visibleCount = pages * pageSize;

  // After "Show more", move focus to the first new card so keyboard users continue from there.
  useEffect(() => {
    if (pendingFocusIndex.current === null) return;
    gridRef.current?.querySelectorAll('h3 a')[pendingFocusIndex.current]?.focus();
    pendingFocusIndex.current = null;
  });

  function showMore() {
    pendingFocusIndex.current = visibleCount;
    setPage({ key: filterKey, pages: pages + 1 });
  }

  return (
    <>
      <ExploreHero>
        <CountrySearchBar
          query={query}
          filters={filters}
          regions={regions}
          onChange={handleFilterChange}
          onSubmit={showResults}
        />
      </ExploreHero>

      <div className={`${pageContainer} pt-8 pb-8 sm:pt-10`}>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <RegionChips
            regions={regions}
            value={filters.region}
            onChange={(value) => handleFilterChange('region', value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            {status === 'success' && (
              <p role="status" className="text-sm text-fg-muted">
                {isSearching
                  ? `Showing ${results.length} of ${countries.length} countries`
                  : `Showing ${pluralize(results.length, 'top destination')}. Search to find any country.`}
              </p>
            )}
            <div className="flex items-center gap-2">
              <label
                htmlFor="country-sort"
                className="text-sm font-medium whitespace-nowrap text-fg"
              >
                Sort by
              </label>
              <select
                id="country-sort"
                value={filters.sort}
                onChange={(event) => handleFilterChange('sort', event.target.value)}
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-fg hover:border-fg-muted"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <section aria-labelledby="destinations-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="destinations-heading"
                ref={resultsHeadingRef}
                tabIndex={-1}
                className="flex scroll-mt-24 items-center gap-2 text-2xl font-bold tracking-tight text-fg"
              >
                <SparklesIcon className="size-6 text-primary" />
                {isFeaturedView ? 'Popular destinations' : 'Matching destinations'}
              </h2>
              <p className="mt-1 text-fg-muted">
                {isFeaturedView
                  ? 'Explore top countries around the world, from iconic cities to hidden gems.'
                  : 'Countries that match your search and filters.'}
              </p>
            </div>
            {status === 'success' && hasActiveFilters(filters) && (
              <button type="button" className={buttonStyles.secondary} onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>

          {status === 'loading' && <CountryGridSkeleton count={10} />}

          {status === 'error' && (
            <ErrorState title="Couldn't load countries" error={error} onRetry={retry} />
          )}

          {status === 'success' &&
            (results.length === 0 ? (
              <EmptyState
                headingLevel={3}
                title="No countries match your filters"
                description="Try a different search term or widen the region and population filters."
                action={
                  <button type="button" className={buttonStyles.primary} onClick={clearFilters}>
                    Clear filters
                  </button>
                }
              />
            ) : (
              <div ref={gridRef}>
                <CountryGrid
                  items={results.slice(0, visibleCount)}
                  getKey={getCode}
                  renderItem={(country) => (
                    <CountryCard
                      country={country}
                      linkState={linkState}
                      headingLevel={3}
                      featured={isFeaturedView && topPicks.has(country.code)}
                    />
                  )}
                />
                {results.length > visibleCount && (
                  <div className="mt-8 flex justify-center">
                    <button type="button" className={buttonStyles.secondary} onClick={showMore}>
                      Show more countries ({results.length - visibleCount} more)
                    </button>
                  </div>
                )}
              </div>
            ))}
        </section>

        <Reveal>
          <FamousPlaces places={getFamousPlaces(featured, curatedCountries)} />
        </Reveal>
        <Reveal>
          <WhyTripWise />
        </Reveal>
        <Reveal>
          <HowItWorks />
        </Reveal>
        <Reveal>
          <StatsBand
            stats={[
              { value: curatedCountries.length, label: 'hand-picked destinations' },
              { value: 250, prefix: '~', label: 'countries to search' },
              { value: 16, suffix: ' days', label: 'of weather forecasts' },
              { value: 100, suffix: '%', label: 'free, no sign-up' },
            ]}
          />
        </Reveal>
        <Reveal>
          <CallToAction />
        </Reveal>
      </div>
    </>
  );
}
