import { screen, within } from '@testing-library/react';
import { renderRoute } from '../test/renderRoute.jsx';
import { allCountries, makeTrip, readStoredTrips, storeTrips, forecast } from '../test/fixtures.js';
import { getAllCountries } from '../services/restCountries.js';
import { ApiError } from '../services/http.js';
import { formatDate } from '../utils/dates.js';

vi.mock('../services/restCountries.js', () => ({
  getAllCountries: vi.fn(),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));
vi.mock('../services/openMeteo.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getForecast: vi.fn(async () => forecast),
}));

const field = (name) => screen.getByLabelText(name, { exact: false });

beforeEach(() => {
  localStorage.clear();
  getAllCountries.mockResolvedValue(allCountries);
});

async function fillDates(user, start, end) {
  await user.clear(field('Start date'));
  await user.type(field('Start date'), start);
  await user.clear(field('End date'));
  await user.type(field('End date'), end);
}

describe('TripFormPage — create', () => {
  it('creates a trip, persists it with one day per date, and opens it', async () => {
    const { user, router } = renderRoute('/trips/new');
    await screen.findByRole('option', { name: 'France' });

    await user.selectOptions(field('Destination'), 'FRA');
    expect(screen.getByText('Budget currency: EUR.')).toBeInTheDocument();
    await user.type(field('Trip name'), '  Paris getaway  ');
    await fillDates(user, '2026-05-01', '2026-05-03');
    await user.click(screen.getByRole('button', { name: 'Create trip' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Paris getaway' });
    const [trip] = readStoredTrips();
    expect(router.state.location.pathname).toBe(`/trips/${trip.id}`);
    expect(heading).toHaveFocus();
    expect(trip).toMatchObject({
      title: 'Paris getaway',
      countryCode: 'FRA',
      destinationName: 'France',
      currency: 'EUR',
      startDate: '2026-05-01',
      endDate: '2026-05-03',
    });
    expect(trip.days.map((day) => day.date)).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
  });

  it('prefills the destination from ?country= (Plan a trip)', async () => {
    renderRoute('/trips/new?country=jpn');
    await screen.findByRole('option', { name: 'Japan' });
    expect(field('Destination')).toHaveValue('JPN');
  });

  it('ignores an unknown ?country= code', async () => {
    renderRoute('/trips/new?country=ZZZ');
    await screen.findByRole('option', { name: 'Japan' });
    expect(field('Destination')).toHaveValue('');
  });

  it('shows errors on submit, focuses the first invalid field, and saves nothing', async () => {
    const { user } = renderRoute('/trips/new');
    await screen.findByRole('option', { name: 'France' });

    await user.click(screen.getByRole('button', { name: 'Create trip' }));

    expect(field('Destination')).toHaveFocus();
    expect(field('Destination')).toHaveAccessibleDescription('Choose a destination.');
    expect(field('Trip name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Trip name is required.')).toBeInTheDocument();
    expect(screen.getByText('Start date is required.')).toBeInTheDocument();
    expect(readStoredTrips()).toBeUndefined(); // nothing written: unchanged data isn't re-saved
  });

  it('validates the date range on blur', async () => {
    const { user } = renderRoute('/trips/new');
    await screen.findByRole('option', { name: 'France' });

    await fillDates(user, '2026-05-10', '2026-05-01');
    await user.tab();

    expect(screen.getByText('End date must be on or after the start date.')).toBeInTheDocument();
  });

  it('shows a retryable error when destinations fail to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getAllCountries
      .mockRejectedValueOnce(
        new ApiError('blocked', { kind: 'http', status: 403, code: 'originNotAllowed' }),
      )
      .mockResolvedValueOnce(allCountries);
    const { user } = renderRoute('/trips/new');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load the list of destinations");
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('option', { name: 'France' })).toBeInTheDocument();
  });
});

describe('TripFormPage — edit', () => {
  it('prefills, saves changes and keeps day content', async () => {
    const trip = makeTrip({ id: 'abc' });
    trip.days[1].notes = 'Museum day';
    storeTrips([trip]);
    const { user, router } = renderRoute('/trips/abc/edit');
    await screen.findByRole('option', { name: 'France' });

    expect(field('Trip name')).toHaveValue('Paris getaway');
    expect(field('Destination')).toHaveValue('FRA');
    expect(
      screen.getByText(/Budget currency: EUR\. Changing the destination keeps it\./),
    ).toBeInTheDocument();

    await user.clear(field('Trip name'));
    await user.type(field('Trip name'), 'Spring in Paris');
    await fillDates(user, '2026-05-02', '2026-05-04');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Spring in Paris' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/trips/abc');
    const [saved] = readStoredTrips();
    expect(saved.days.map((day) => day.date)).toEqual(['2026-05-02', '2026-05-03', '2026-05-04']);
    expect(saved.days[0]).toMatchObject({ id: 'abc-day-2', notes: 'Museum day' });
    expect(saved.updatedAt > trip.updatedAt).toBe(true);
  });

  it('asks before removing days that have plans', async () => {
    const trip = makeTrip({ id: 'abc' });
    trip.days[0].activities = [
      {
        id: 'a1',
        title: 'Louvre',
        time: null,
        location: '',
        notes: '',
        category: 'sightseeing',
        url: '',
      },
    ];
    storeTrips([trip]);
    const { user } = renderRoute('/trips/abc/edit');
    await screen.findByRole('option', { name: 'France' });

    await fillDates(user, '2026-05-02', '2026-05-03');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const dialog = screen.getByRole('dialog', { name: 'Remove 1 planned day?' });
    // Locale-independent: compare with the app's own formatter (the machine's locale may be en-GB).
    expect(dialog).toHaveTextContent(formatDate('2026-05-01', { dateStyle: 'medium' }));

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(readStoredTrips()[0].startDate).toBe('2026-05-01');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await user.click(screen.getByRole('button', { name: 'Remove and save' }));
    await screen.findByRole('heading', { level: 1, name: 'Paris getaway' });
    expect(readStoredTrips()[0].days.map((day) => day.date)).toEqual(['2026-05-02', '2026-05-03']);
  });

  it('keeps the saved destination selectable when the country list fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getAllCountries.mockRejectedValue(new ApiError('down', { kind: 'network' }));
    storeTrips([makeTrip({ id: 'abc' })]);
    const { user } = renderRoute('/trips/abc/edit');

    await screen.findByRole('alert');
    expect(field('Destination')).toHaveValue('FRA');
    await user.clear(field('Trip name'));
    await user.type(field('Trip name'), 'Offline edit');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Offline edit' }),
    ).toBeInTheDocument();
  });

  it('shows "Trip not found" for an unknown id', () => {
    renderRoute('/trips/missing/edit');
    expect(screen.getByRole('heading', { level: 1, name: 'Trip not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my trips' })).toHaveAttribute('href', '/trips');
  });
});
