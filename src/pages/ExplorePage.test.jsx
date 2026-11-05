import { act, screen, within } from '@testing-library/react';
import { renderRoute } from '../test/renderRoute.jsx';
import { allCountries, forecast, france, japan } from '../test/fixtures.js';
import { getCuratedCountries } from '../services/attractions.js';
import { getAllCountries, getCountry, getNeighbours } from '../services/restCountries.js';
import { ApiError } from '../services/http.js';

vi.mock('../services/restCountries.js', () => ({
  getAllCountries: vi.fn(),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));
vi.mock('../services/openMeteo.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getForecast: vi.fn(async () => forecast),
}));

const cardNames = () =>
  screen
    .getAllByRole('article')
    .map((card) => within(card).getByRole('heading', { level: 3 }).textContent);

// Browsing lists the curated snapshot (getCuratedCountries); make every fixture country curated
// so these tests see them all. The curated-only behaviour has its own test below.
const withCurated = (countries) => getCuratedCountries.mockReturnValue(countries);

beforeEach(() => {
  localStorage.clear();
  getAllCountries.mockResolvedValue(allCountries);
  withCurated(allCountries);
});

describe('ExplorePage', () => {
  it('lists curated destinations at once, featured first and the rest by name', async () => {
    renderRoute('/');

    expect(
      await screen.findByText('Showing 6 top destinations. Search to find any country.'),
    ).toBeInTheDocument();
    // Fixture featured order: JPN, FRA (see destinations in test/fixtures.js).
    expect(cardNames()).toEqual([
      'Japan',
      'France',
      'Belgium',
      "Côte d'Ivoire",
      'Germany',
      'Tuvalu',
    ]);
    expect(screen.getByRole('link', { name: 'France' })).toHaveAttribute('href', '/countries/FRA');
    expect(document.title).toBe('Explore destinations · TripWise');
  });

  it('searches with accent-insensitive matching and stores the query in the URL', async () => {
    const { user, router } = renderRoute('/');
    await screen.findByText('Showing 6 top destinations. Search to find any country.');

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'cote');

    expect(await screen.findByText('Showing 1 of 6 countries')).toBeInTheDocument();
    expect(cardNames()).toEqual(["Côte d'Ivoire"]);
    expect(router.state.location.search).toBe('?q=cote');
  });

  it('lifts the search bar to the top while typing, and moves to the results on Enter', async () => {
    const scrolled = [];
    Element.prototype.scrollIntoView = function scrollIntoView(options) {
      scrolled.push({ element: this, options });
    };
    try {
      const { user } = renderRoute('/');
      await screen.findByText('Showing 6 top destinations. Search to find any country.');
      const form = screen.getByRole('search', { name: 'Filter countries' });
      let formTop = 500; // far down the page at first
      vi.spyOn(form, 'getBoundingClientRect').mockImplementation(() => ({ top: formTop }));

      await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'c');
      expect(scrolled).toEqual([
        { element: form, options: { block: 'start', behavior: 'smooth' } },
      ]);

      formTop = 16; // now just under the header: typing more doesn't scroll again
      await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'ote{Enter}');
      expect(scrolled).toHaveLength(2);
      const heading = await screen.findByRole('heading', { name: /Matching destinations/ });
      expect(scrolled[1].element).toBe(heading);
      expect(heading).toHaveFocus();
    } finally {
      delete Element.prototype.scrollIntoView;
    }
  });

  it('has a Filters button for phones that opens the region and population filters', async () => {
    const { user } = renderRoute('/?region=Europe');
    const search = screen.getByRole('search', { name: 'Filter countries' });
    const toggle = within(search).getByRole('button', { name: 'Filters (1 active)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(search).getByLabelText('Region').parentElement).toHaveClass('hidden');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(search).getByLabelText('Region').parentElement).not.toHaveClass('hidden');
  });

  it('filters by region and population and sorts', async () => {
    const { user, router } = renderRoute('/');
    await screen.findByText('Showing 6 top destinations. Search to find any country.');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Region' }), 'Europe');
    expect(cardNames()).toEqual(['France', 'Belgium', 'Germany']); // featured first

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'population-desc');
    expect(cardNames()).toEqual(['Germany', 'France', 'Belgium']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Population' }), 'gt100m');
    expect(screen.getByText('No countries match your filters')).toBeInTheDocument();
    expect(new URLSearchParams(router.state.location.search).get('pop')).toBe('gt100m');
  });

  it('restores filters from the URL and ignores invalid values', async () => {
    renderRoute('/?region=Asia&sort=bogus&pop=nope');
    await screen.findByText('Showing 1 top destination. Search to find any country.');
    expect(cardNames()).toEqual(['Japan']);
    expect(screen.getByRole('combobox', { name: 'Region' })).toHaveValue('Asia');
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('featured');
  });

  it('clears filters from the empty state', async () => {
    const { user, router } = renderRoute('/?region=Oceania&q=zzz');
    await screen.findByText('No countries match your filters');

    const clearButtons = screen.getAllByRole('button', { name: 'Clear filters' });
    await user.click(clearButtons.at(-1));

    expect(
      screen.getByText('Showing 6 top destinations. Search to find any country.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
    expect(router.state.location.search).toBe('');
  });

  it('shows a loading state while a search loads the full list', async () => {
    getAllCountries.mockReturnValue(new Promise(() => {}));
    const { user } = renderRoute('/');
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'tuvalu');
    expect(await screen.findByText('Loading countries…')).toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getAllCountries
      .mockRejectedValueOnce(new ApiError('down', { kind: 'network' }))
      .mockResolvedValueOnce(allCountries);
    const { user } = renderRoute('/');
    expect(getAllCountries).not.toHaveBeenCalled(); // browsing needs no request

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'tuvalu');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load countries");
    expect(alert).toHaveTextContent('Check your internet connection');

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Showing 1 of 6 countries')).toBeInTheDocument();
  });

  it('saves countries to the wishlist from a card', async () => {
    const { user } = renderRoute('/');
    await screen.findByText('Showing 6 top destinations. Search to find any country.');

    await user.click(screen.getByRole('button', { name: 'Save France to wishlist' }));

    expect(screen.getByRole('button', { name: 'Remove France from wishlist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wishlist (1 saved)' })).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem('tripwise:v1:wishlist'));
    expect(stored.data).toEqual([{ countryCode: 'FRA', addedAt: expect.any(String) }]);
  });

  it('passes the current filters to country links for "Back to Explore"', async () => {
    getCountry.mockResolvedValue({
      ...japan,
      languages: [],
      timezones: [],
      borders: [],
      areaKm2: null,
    });
    getNeighbours.mockResolvedValue([]);
    const { user } = renderRoute('/?region=Asia');
    await screen.findByText('Showing 1 top destination. Search to find any country.');

    await user.click(screen.getByRole('link', { name: 'Japan' }));

    expect(await screen.findByRole('link', { name: 'Back to Explore' })).toHaveAttribute(
      'href',
      '/?region=Asia',
    );
  });
});

describe('ExplorePage — hero, featured destinations and region chips', () => {
  it('marks featured destinations and filters with the region chips', async () => {
    const { user } = renderRoute('/');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Explore the world without limits',
      }),
    ).toBeInTheDocument();
    await screen.findByText('Showing 6 top destinations. Search to find any country.');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Popular destinations' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('Top pick');
    expect(screen.getAllByText('Top pick')).toHaveLength(2);

    await user.click(screen.getByRole('radio', { name: 'Asia' }));

    expect(cardNames()).toEqual(['Japan']);
    expect(screen.getByRole('combobox', { name: 'Region' })).toHaveValue('Asia');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Matching destinations' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Top pick')).not.toBeInTheDocument();
  });

  it('moves focus to the results when Search is pressed', async () => {
    const { user } = renderRoute('/');
    await screen.findByText('Showing 6 top destinations. Search to find any country.');

    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Popular destinations' })).toHaveFocus();
  });
});

describe('ExplorePage — paging', () => {
  it('shows 10 countries at a time and focuses the first new card after "Show more"', async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      ...france,
      code: `Q${String.fromCharCode(65 + i)}A`,
      name: `Country ${String(i + 1).padStart(2, '0')}`,
    }));
    getAllCountries.mockResolvedValue(many);
    withCurated(many);
    const { user } = renderRoute('/');
    await screen.findByText('Showing 15 top destinations. Search to find any country.');
    expect(screen.getAllByRole('article')).toHaveLength(10);

    await user.click(screen.getByRole('button', { name: 'Show more countries (5 more)' }));

    expect(screen.getAllByRole('article')).toHaveLength(15);
    expect(screen.getByRole('link', { name: 'Country 11' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });

  it('shows 6 countries at a time on phones', async () => {
    vi.stubGlobal('matchMedia', (query) => ({
      matches: query === '(max-width: 599px)',
      addEventListener() {},
      removeEventListener() {},
    }));
    const many = Array.from({ length: 15 }, (_, i) => ({
      ...france,
      code: `Q${String.fromCharCode(65 + i)}A`,
      name: `Country ${String(i + 1).padStart(2, '0')}`,
    }));
    withCurated(many);
    const { user } = renderRoute('/');
    await screen.findByText('Showing 15 top destinations. Search to find any country.');
    expect(screen.getAllByRole('article')).toHaveLength(6);

    await user.click(screen.getByRole('button', { name: 'Show more countries (9 more)' }));

    expect(screen.getAllByRole('article')).toHaveLength(12);
    expect(screen.getByRole('link', { name: 'Country 07' })).toHaveFocus();
  });
});

describe('ExplorePage — curated destinations', () => {
  it('lists only countries with photos, but search finds every country', async () => {
    withCurated([france, japan]);
    const { user } = renderRoute('/');

    expect(
      await screen.findByText('Showing 2 top destinations. Search to find any country.'),
    ).toBeInTheDocument();
    expect(cardNames()).toEqual(['Japan', 'France']);
    expect(getAllCountries).not.toHaveBeenCalled();

    await user.type(screen.getByRole('searchbox'), 'tuvalu');
    expect(await screen.findByText('Showing 1 of 6 countries')).toBeInTheDocument();
    expect(cardNames()).toEqual(['Tuvalu']);
  });
});

describe('ExplorePage — hero slideshow', () => {
  // The caption under the search bar: "Photo: <name> · <country>".
  const caption = () =>
    screen.getByText(
      (_, element) => element?.tagName === 'P' && element.textContent.startsWith('Photo:'),
    );

  afterEach(() => vi.useRealTimers());

  it('cycles through the photos every 5 seconds, with no pause control', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    renderRoute('/');
    expect(caption()).toHaveTextContent('Photo: Moraine Lake');

    act(() => vi.advanceTimersByTime(5000));
    expect(caption()).toHaveTextContent('Photo: Mount Fuji · Japan');
    expect(screen.getByRole('button', { name: 'Show photo 2 of 2: Mount Fuji' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    act(() => vi.advanceTimersByTime(5000));
    expect(caption()).toHaveTextContent('Photo: Moraine Lake'); // back to the first photo
    expect(screen.queryByRole('button', { name: /pause|play/i })).not.toBeInTheDocument();
  });

  it('jumps to a photo with its dot', async () => {
    const { user } = renderRoute('/');
    await user.click(screen.getByRole('button', { name: 'Show photo 2 of 2: Mount Fuji' }));
    expect(caption()).toHaveTextContent('Photo: Mount Fuji · Japan');
  });
});

describe('ExplorePage — home sections', () => {
  it('shows famous places, the smart features, how it works and the numbers', async () => {
    renderRoute('/');
    const famous = screen.getByRole('region', { name: 'Famous sights waiting for you' });
    expect(within(famous).getByRole('link', { name: /Mount Fuji.*Japan/ })).toHaveAttribute(
      'href',
      '/countries/JPN',
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Auto-plan my days' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your trip in three easy steps' })).toHaveTextContent(
      'Step 1: Pick a destination',
    );
    const numbers = screen.getByRole('region', { name: 'TripWise in numbers' });
    expect(within(numbers).getByText('hand-picked destinations').nextSibling).toHaveTextContent(
      '6',
    );
    expect(screen.getByRole('link', { name: 'Plan a trip' })).toHaveAttribute('href', '/trips/new');
  });
});
