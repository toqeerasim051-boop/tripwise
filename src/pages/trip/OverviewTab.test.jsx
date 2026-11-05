import { screen, within } from '@testing-library/react';
import { renderRoute } from '../../test/renderRoute.jsx';
import { forecast, makeTrip, storeTrips } from '../../test/fixtures.js';
import { getForecast } from '../../services/openMeteo.js';
import { ApiError } from '../../services/http.js';
import { buildDays } from '../../utils/itinerary.js';

vi.mock('../../services/restCountries.js', () => ({
  getAllCountries: vi.fn(async () => []),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));
vi.mock('../../services/openMeteo.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getForecast: vi.fn(),
}));

// Fixture forecast covers 2026-11-01 .. 2026-11-16.
function seed(startDate, endDate, overrides = {}) {
  let n = 0;
  storeTrips([
    makeTrip({
      id: 'abc',
      startDate,
      endDate,
      days: buildDays(startDate, endDate, () => `d${(n += 1)}`),
      ...overrides,
    }),
  ]);
}

const weather = () => screen.findByRole('region', { name: 'Weather in France' });

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  getForecast.mockResolvedValue(forecast);
});

describe('OverviewTab weather', () => {
  it('shows the forecast for trip days inside the 16-day window', async () => {
    seed('2026-11-03', '2026-11-05');
    renderRoute('/trips/abc');

    const region = await weather();
    expect(getForecast).toHaveBeenCalledWith({ lat: 48.87, lon: 2.33 }, expect.anything());
    expect(await within(region).findByText('Forecast for your trip')).toBeInTheDocument();
    expect(within(region).getAllByRole('listitem')).toHaveLength(3);
    expect(within(region).queryByText('Today')).not.toBeInTheDocument();
  });

  it('labels a forecast saved earlier when offline', async () => {
    getForecast.mockResolvedValue({ ...forecast, staleSince: Date.now() - 3 * 3_600_000 });
    seed('2026-11-03', '2026-11-05');
    renderRoute('/trips/abc');

    const region = await weather();
    expect(
      await within(region).findByText(/You seem to be offline\. Showing the weather saved/),
    ).toHaveTextContent('3 hours ago');
  });

  it('says when only part of the trip is covered', async () => {
    seed('2026-11-15', '2026-11-18');
    renderRoute('/trips/abc');

    const region = await weather();
    expect(await within(region).findByText('Forecast for 2 days of your trip')).toBeInTheDocument();
    expect(region).toHaveTextContent('Forecast available up to 16 days ahead.');
  });

  it('shows the current week for trips beyond the window', async () => {
    seed('2026-12-24', '2026-12-26');
    renderRoute('/trips/abc');

    const region = await weather();
    expect(await within(region).findByText('Current 7-day forecast')).toBeInTheDocument();
    expect(region).toHaveTextContent(
      'Forecast available up to 16 days ahead. Your trip starts in 53 days.',
    );
    expect(within(region).getAllByRole('listitem')[0]).toHaveTextContent('Today');
  });

  it('explains past trips', async () => {
    seed('2026-05-01', '2026-05-03');
    renderRoute('/trips/abc');

    expect(
      await screen.findByText('This trip has ended. Showing current conditions.'),
    ).toBeInTheDocument();
  });

  it('handles errors with retry and destinations without coordinates', async () => {
    getForecast
      .mockRejectedValueOnce(new ApiError('down', { kind: 'network' }))
      .mockResolvedValueOnce(forecast);
    seed('2026-11-03', '2026-11-05');
    const { user, unmount } = renderRoute('/trips/abc');

    const alert = await within(await weather()).findByRole('alert');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Forecast for your trip')).toBeInTheDocument();
    unmount();

    seed('2026-11-03', '2026-11-05', { lat: null, lon: null });
    renderRoute('/trips/abc');
    expect(screen.getByText("Weather isn't available for this destination.")).toBeInTheDocument();
  });
});
