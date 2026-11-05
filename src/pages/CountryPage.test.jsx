import { screen, within } from '@testing-library/react';
import { renderRoute } from '../test/renderRoute.jsx';
import {
  belgium,
  forecast,
  france,
  franceDetail,
  germany,
  makeTrip,
  readStoredTrips,
  storeTrips,
} from '../test/fixtures.js';
import { getAttractions } from '../services/attractions.js';
import { getCountry, getNeighbours } from '../services/restCountries.js';
import { getForecast } from '../services/openMeteo.js';
import { ApiError } from '../services/http.js';

vi.mock('../services/restCountries.js', () => ({
  getAllCountries: vi.fn(),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));
vi.mock('../services/openMeteo.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getForecast: vi.fn(),
}));

const section = (name) => screen.getByRole('region', { name });

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  getCountry.mockResolvedValue(franceDetail);
  getNeighbours.mockResolvedValue([belgium, germany]);
  getForecast.mockResolvedValue(forecast);
});

describe('CountryPage', () => {
  it('shows facts, weather and neighbours', async () => {
    renderRoute('/countries/fra');

    expect(await screen.findByRole('heading', { level: 1, name: 'France' })).toBeInTheDocument();
    expect(getCountry).toHaveBeenCalledWith('FRA', expect.anything());
    expect(document.title).toBe('France · TripWise');
    expect(screen.getByText('French Republic · Western Europe')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: france.flagAlt })).toBeInTheDocument();

    const facts = section('About France');
    expect(within(facts).getByText('Paris')).toBeInTheDocument();
    expect(within(facts).getByText('Europe · Western Europe')).toBeInTheDocument();
    expect(within(facts).getByText('68,000,000')).toBeInTheDocument();
    expect(within(facts).getByText('551,695 km²')).toBeInTheDocument();
    expect(within(facts).getByText('Euro (EUR, €)')).toBeInTheDocument();

    const weather = await screen.findByRole('region', { name: 'Weather in Paris' });
    expect(getForecast).toHaveBeenCalledWith({ lat: 48.87, lon: 2.33 }, expect.anything());
    expect(await within(weather).findByText('21°C')).toBeInTheDocument();
    expect(within(weather).getByText('Overcast')).toBeInTheDocument();
    const days = within(weather).getAllByRole('listitem');
    expect(days).toHaveLength(7);
    expect(days[0]).toHaveTextContent('Today');
    expect(days[0]).toHaveTextContent(/Light rain.*high 18°C.*low 10°C.*80% chance of rain/);

    const neighbours = section('Neighbouring countries');
    expect(await within(neighbours).findByRole('link', { name: 'Belgium' })).toHaveAttribute(
      'href',
      '/countries/BEL',
    );
    expect(getNeighbours).toHaveBeenCalledWith(['BEL', 'DEU'], expect.anything());
  });

  it('links to trip planning and toggles the wishlist', async () => {
    const { user } = renderRoute('/countries/FRA');
    await screen.findByRole('heading', { level: 1, name: 'France' });

    expect(screen.getByRole('link', { name: 'Plan a trip' })).toHaveAttribute(
      'href',
      '/trips/new?country=FRA',
    );
    await user.click(screen.getByRole('button', { name: 'Save France to wishlist' }));
    expect(screen.getByRole('button', { name: 'Remove France from wishlist' })).toBeInTheDocument();
  });

  it('keeps the page usable when the weather fails, and retries', async () => {
    getForecast
      .mockRejectedValueOnce(new ApiError('slow', { kind: 'timeout' }))
      .mockResolvedValueOnce(forecast);
    const { user } = renderRoute('/countries/FRA');

    const weather = await screen.findByRole('region', { name: 'Weather in Paris' });
    const alert = await within(weather).findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load the weather");
    expect(section('About France')).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await within(weather).findByText('21°C')).toBeInTheDocument();
  });

  it('uses the country centre when there is no capital, and hides weather without coordinates', async () => {
    getCountry.mockResolvedValueOnce({
      ...franceDetail,
      capital: null,
      coordsSource: 'country',
    });
    const { unmount } = renderRoute('/countries/FRA');
    expect(await screen.findByRole('region', { name: 'Weather in France' })).toHaveTextContent(
      "Based on the country's geographic centre.",
    );
    unmount();

    getCountry.mockResolvedValueOnce({ ...franceDetail, lat: null, lon: null, coordsSource: null });
    renderRoute('/countries/FRA');
    await screen.findByRole('heading', { level: 1, name: 'France' });
    expect(screen.queryByRole('region', { name: /Weather/ })).not.toBeInTheDocument();
    expect(getForecast).toHaveBeenCalledTimes(1);
  });

  it('says when a country has no land borders', async () => {
    getCountry.mockResolvedValueOnce({ ...franceDetail, borders: [] });
    renderRoute('/countries/FRA');
    expect(await screen.findByText('France has no land borders.')).toBeInTheDocument();
    expect(getNeighbours).not.toHaveBeenCalled();
  });

  it('shows "Country not found" for a 404', async () => {
    getCountry.mockRejectedValueOnce(new ApiError('nope', { kind: 'http', status: 404 }));
    renderRoute('/countries/ZZZ');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Country not found' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/couldn't find a country with the code “ZZZ”/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error with retry for other failures', async () => {
    getCountry
      .mockRejectedValueOnce(new ApiError('down', { kind: 'http', status: 503 }))
      .mockResolvedValueOnce(franceDetail);
    const { user } = renderRoute('/countries/FRA');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('having problems');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'France' })).toBeInTheDocument();
  });

  it('keeps focus on the page heading when navigating to a neighbour', async () => {
    getCountry.mockImplementation(async (code) =>
      code === 'BEL'
        ? { ...belgium, languages: [], timezones: [], borders: [], areaKm2: null }
        : franceDetail,
    );
    const { user } = renderRoute('/countries/FRA');
    const neighbours = await screen.findByRole('region', { name: 'Neighbouring countries' });

    await user.click(await within(neighbours).findByRole('link', { name: 'Belgium' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Belgium' });
    expect(heading).toHaveFocus();
  });
});

describe('CountryPage — top attractions', () => {
  const attractionsRegion = () =>
    screen.findByRole('region', { name: 'Top attractions in France' });

  it('lists curated attractions with places and Wikipedia links, without credit clutter', async () => {
    renderRoute('/countries/FRA');
    const region = await attractionsRegion();
    const cards = await within(region).findAllByRole('article');

    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByRole('heading', { name: 'Eiffel Tower' })).toBeInTheDocument();
    expect(cards[0]).toHaveTextContent('Paris');
    expect(within(cards[0]).queryByText(/Photo:/)).not.toBeInTheDocument(); // credits live on /credits
    expect(within(cards[0]).queryByRole('link')).not.toBeInTheDocument(); // no external links
    expect(within(cards[1]).getByText('No photo available')).toBeInTheDocument();
  });

  it('adds an attraction to a chosen day of a trip to this country', async () => {
    storeTrips([
      makeTrip({ id: 'paris', title: 'Paris getaway' }),
      makeTrip({ id: 'tokyo', title: 'Tokyo', countryCode: 'JPN', destinationName: 'Japan' }),
    ]);
    const { user } = renderRoute('/countries/FRA');
    const region = await attractionsRegion();
    const addButton = await within(region).findByRole('button', {
      name: 'Add Eiffel Tower to trip',
    });

    await user.click(addButton);
    const dialog = screen.getByRole('dialog', { name: 'Add “Eiffel Tower” to a trip' });
    expect(dialog).toHaveTextContent('Trip: Paris getaway'); // only trips to France are offered
    const day = within(dialog).getByRole('combobox', { name: 'Day' });
    expect(day).toHaveFocus();
    await user.selectOptions(day, 'paris-day-2');
    await user.click(within(dialog).getByRole('button', { name: 'Add to Day 2' }));

    expect(
      screen.getByText('Added “Eiffel Tower” to Day 2 of “Paris getaway”.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View itinerary' })).toHaveAttribute(
      'href',
      '/trips/paris/itinerary',
    );
    expect(readStoredTrips()[0].days[1].activities).toEqual([
      expect.objectContaining({
        title: 'Eiffel Tower',
        location: 'Paris',
        category: 'sightseeing',
        url: '',
      }),
    ]);
  });

  it('warns about duplicates and offers to plan a trip when there is none', async () => {
    const trip = makeTrip({ id: 'paris' });
    trip.days[0].activities = [
      {
        id: 'a1',
        title: 'Eiffel Tower',
        time: null,
        location: '',
        notes: '',
        category: 'sightseeing',
        url: '',
      },
    ];
    storeTrips([trip]);
    const { user, unmount } = renderRoute('/countries/FRA');
    const region = await attractionsRegion();
    await user.click(
      await within(region).findByRole('button', { name: 'Add Eiffel Tower to trip' }),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '“Eiffel Tower” is already planned on this day.',
    );
    unmount();

    localStorage.clear();
    const { user: user2 } = renderRoute('/countries/FRA');
    const region2 = await attractionsRegion();
    await user2.click(await within(region2).findByRole('button', { name: 'Add Louvre to trip' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent("You don't have a trip to France yet.");
    expect(within(dialog).getByRole('link', { name: 'Plan a trip to France' })).toHaveAttribute(
      'href',
      '/trips/new?country=FRA',
    );
  });

  it('shows an empty state without external links, and retries after an error', async () => {
    getAttractions.mockResolvedValueOnce([]);
    const { unmount } = renderRoute('/countries/FRA');
    expect(
      await screen.findByText("We haven't picked top attractions for France yet."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Wikivoyage/ })).not.toBeInTheDocument();
    unmount();

    getAttractions.mockRejectedValueOnce(new Error('chunk failed'));
    const { user } = renderRoute('/countries/FRA');
    const region = await attractionsRegion();
    const alert = await within(region).findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load attractions");
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await within(region).findAllByRole('article')).toHaveLength(2);
  });
});
