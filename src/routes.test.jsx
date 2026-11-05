import { screen, within } from '@testing-library/react';
import { renderRoute } from './test/renderRoute.jsx';
import { allCountries, forecast, franceDetail, makeTrip, storeTrips } from './test/fixtures.js';

vi.mock('./services/restCountries.js', () => ({
  getAllCountries: vi.fn(async () => allCountries),
  getCountry: vi.fn(async () => franceDetail),
  getNeighbours: vi.fn(async () => []),
}));
vi.mock('./services/openMeteo.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getForecast: vi.fn(async () => forecast),
}));

beforeEach(() => {
  localStorage.clear();
  storeTrips([makeTrip({ id: 'abc', title: 'Trip' })]);
});

describe('routing', () => {
  it.each([
    ['/', 'Explore the world without limits'],
    ['/countries/fra', 'France'],
    ['/wishlist', 'Wishlist'],
    ['/trips', 'My trips'],
    ['/trips/new', 'Plan a new trip'],
    ['/trips/abc/edit', 'Edit trip'],
    ['/trips/abc', 'Trip'],
    ['/trips/abc/itinerary', 'Trip'],
    ['/trips/abc/budget', 'Trip'],
    ['/trips/abc/bookings', 'Trip'],
    ['/about', 'About TripWise'],
    ['/credits', 'About TripWise'], // old address redirects
    ['/does-not-exist', 'Page not found'],
  ])('renders %s', async (path, heading) => {
    renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('navigates with the primary nav and marks the current page', async () => {
    const { user } = renderRoute('/');
    const nav = screen.getByRole('navigation', { name: 'Primary' });

    await user.click(within(nav).getByRole('link', { name: 'My trips' }));

    expect(screen.getByRole('heading', { level: 1, name: 'My trips' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'My trips' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Explore' })).not.toHaveAttribute('aria-current');
  });

  it('moves focus to the new page heading after navigation', async () => {
    const { user } = renderRoute('/');

    await user.click(
      within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('link', {
        name: 'Wishlist',
      }),
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Wishlist' })).toHaveFocus();
  });

  it('switches between trip tabs', async () => {
    const { user } = renderRoute('/trips/abc');
    const tabs = screen.getByRole('navigation', { name: 'Trip sections' });

    expect(within(tabs).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(within(tabs).getByRole('link', { name: 'Budget' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Budget' })).toBeInTheDocument();
    expect(within(tabs).getByRole('link', { name: 'Budget' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Edit trip' })).toHaveAttribute(
      'href',
      '/trips/abc/edit',
    );
  });
});

describe('mobile menu', () => {
  it('toggles aria-expanded and closes on Escape', async () => {
    const { user } = renderRoute('/');
    const toggle = screen.getByRole('button', { name: 'Open menu' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});

describe('layout', () => {
  it('provides a skip link and a footer with app links only', () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
    const footer = screen.getByRole('contentinfo');
    const hrefs = within(footer)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/', '/', '/wishlist', '/trips', '/trips/new', '/about']);
    expect(within(footer).getByRole('link', { name: 'Photo credits' })).toHaveAttribute(
      'href',
      '/about',
    );
    expect(within(footer).queryByRole('link', { name: /about|privacy/i })).toBeNull();
    expect(within(footer).getByRole('navigation', { name: 'Plan links' })).toBeInTheDocument();
  });
});

describe('theme switcher', () => {
  afterEach(() => delete document.documentElement.dataset.theme);

  const storedSettings = () => JSON.parse(localStorage.getItem('tripwise:v1:settings'));

  it('follows the device first, then one button toggles and remembers light/dark', async () => {
    const { user } = renderRoute('/');
    // No manual choice yet: the device theme applies (light in jsdom).
    expect(document.documentElement.dataset).not.toHaveProperty('theme');
    expect(screen.getAllByRole('button', { name: /theme/i })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(storedSettings()).toEqual({ version: 1, data: { theme: 'dark' } });

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(storedSettings()).toEqual({ version: 1, data: { theme: 'light' } });
  });

  it('switches to light when the device is dark', async () => {
    vi.stubGlobal('matchMedia', (query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      addEventListener() {},
      removeEventListener() {},
    }));
    const { user } = renderRoute('/');
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('starts with the saved theme', () => {
    localStorage.setItem(
      'tripwise:v1:settings',
      JSON.stringify({ version: 1, data: { theme: 'dark' } }),
    );
    renderRoute('/');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

describe('header search', () => {
  const headerSearches = () => screen.queryAllByRole('search', { name: 'Search countries' });

  it('is hidden on Explore while the hero search is on screen', () => {
    renderRoute('/');
    expect(headerSearches()).toHaveLength(0);
    expect(
      screen.queryByRole('button', { name: 'Search', expanded: false }),
    ).not.toBeInTheDocument();
  });

  it('searches countries from another page and moves to the results', async () => {
    const { user } = renderRoute('/wishlist');
    const [search] = headerSearches();
    await user.type(within(search).getByRole('combobox'), 'france{Enter}');

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Explore the world without limits',
    );
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('france');
    const results = await screen.findByText(/Showing 1 of/);
    expect(results).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(screen.getByRole('heading', { name: /destinations|results/i })).toHaveFocus(),
    );
  });

  it('lists matching destinations while typing and opens the chosen one', async () => {
    const { user } = renderRoute('/trips');
    const [search] = headerSearches();
    const input = within(search).getByRole('combobox');
    await user.type(input, 'fr');

    expect(input).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('listbox', { name: 'Matching destinations' });
    const options = within(list).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'FranceParis · Europe',
      'Search all countries for “fr”',
    ]);

    await user.click(within(list).getByRole('option', { name: /France/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'France' })).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('chooses a destination with the arrow keys and closes the box with Escape', async () => {
    const { user } = renderRoute('/trips');
    const input = within(headerSearches()[0]).getByRole('combobox');
    await user.type(input, 'jap');
    await user.keyboard('{ArrowDown}');

    const japan = screen.getByRole('option', { name: /Japan/ });
    expect(japan).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', japan.id);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}'); // the "Search all countries" option
    expect(await screen.findByText(/Showing \d+ of/)).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('jap');
  });

  it('opens a search row from the phone search button', async () => {
    const { user } = renderRoute('/trips');
    await user.click(screen.getByRole('button', { name: 'Search', expanded: false }));

    expect(headerSearches()).toHaveLength(2);
    expect(within(headerSearches()[1]).getByRole('combobox')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(headerSearches()).toHaveLength(1);
  });
});
