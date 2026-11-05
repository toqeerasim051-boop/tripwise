import { act, screen, within } from '@testing-library/react';
import { renderRoute } from '../../test/renderRoute.jsx';
import { makeTrip, readStoredTrips, storeTrips, forecast } from '../../test/fixtures.js';
import { formatDateRange } from '../../utils/dates.js';
import { downloadTripPdf } from '../../utils/tripPdf.js';

// The PDF itself is tested in utils/tripPdf.test.js; here only the button.
vi.mock('../../utils/tripPdf.js', () => ({ downloadTripPdf: vi.fn(async () => {}) }));

vi.mock('../../services/restCountries.js', () => ({
  getAllCountries: vi.fn(async () => []),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));
vi.mock('../../services/openMeteo.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getForecast: vi.fn(async () => forecast),
}));

beforeEach(() => {
  localStorage.clear();
  storeTrips([makeTrip({ id: 'abc' })]);
});

describe('TripLayout', () => {
  it('shows the trip header, status, tabs and overview', () => {
    renderRoute('/trips/abc');

    expect(screen.getByRole('heading', { level: 1, name: 'Paris getaway' })).toBeInTheDocument();
    expect(document.title).toBe('Paris getaway · TripWise');
    // Locale-independent: build the expected range with the app's formatter.
    const range = formatDateRange('2026-05-01', '2026-05-03');
    expect(screen.getByText(`France · ${range} · 3 days`)).toBeInTheDocument();
    expect(screen.getByText(/Upcoming|In progress|Past/)).toBeInTheDocument();

    const summary = screen.getByRole('region', { name: 'Trip summary' });
    expect(within(summary).getByRole('link', { name: 'France' })).toHaveAttribute(
      'href',
      '/countries/FRA',
    );
    expect(summary).toHaveTextContent('EUR');
    expect(screen.getByRole('link', { name: 'Edit trip' })).toHaveAttribute(
      'href',
      '/trips/abc/edit',
    );
  });

  it('switches tabs', async () => {
    const { user } = renderRoute('/trips/abc');
    const tabs = screen.getByRole('navigation', { name: 'Trip sections' });

    await user.click(within(tabs).getByRole('link', { name: 'Budget' }));

    expect(within(tabs).getByRole('link', { name: 'Budget' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Budget' })).toBeInTheDocument();
  });

  it('deletes the trip after confirmation and returns to the list with a notice', async () => {
    const { user, router } = renderRoute('/trips/abc/itinerary');

    await user.click(screen.getByRole('button', { name: 'Delete trip' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete trip' }),
    );

    expect(router.state.location.pathname).toBe('/trips');
    expect(await screen.findByText('Deleted “Paris getaway”.')).toBeInTheDocument();
    expect(readStoredTrips()).toEqual([]);
  });

  it('shows "Trip not found" for unknown ids and for trips deleted in another tab', async () => {
    const { unmount } = renderRoute('/trips/nope/budget');
    expect(screen.getByRole('heading', { level: 1, name: 'Trip not found' })).toBeInTheDocument();
    unmount();

    renderRoute('/trips/abc');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'tripwise:v1:trips',
        newValue: JSON.stringify({ version: 1, data: [] }),
        storageArea: localStorage,
      }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Trip not found' }),
    ).toBeInTheDocument();
  });
});

describe('TripLayout — PDF and print', () => {
  it('downloads the trip plan as a PDF, and shows an error if that fails', async () => {
    const { user } = renderRoute('/trips/abc');
    const button = screen.getByRole('button', { name: 'Download PDF' });
    expect(screen.queryByRole('button', { name: /Print/ })).not.toBeInTheDocument();

    await user.click(button);
    expect(downloadTripPdf).toHaveBeenCalledWith(expect.objectContaining({ id: 'abc' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    downloadTripPdf.mockRejectedValueOnce(new Error('broken'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await user.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't create the PDF");
  });

  it('prints (Ctrl+P) a plain summary of the whole trip', async () => {
    storeTrips([
      makeTrip({
        id: 'abc',
        title: 'Paris getaway',
        budget: { totalCents: 500_00 },
        expenses: [
          {
            id: 'e1',
            category: 'food',
            description: 'Dinner',
            amountCents: 60_00,
            date: '2026-05-01',
          },
        ],
        savedLinks: [
          { id: 'l1', type: 'hotel', label: 'Hotel booking', url: 'https://hotel.example/x' },
        ],
        days: [
          {
            id: 'd1',
            date: '2026-05-01',
            notes: 'Arrive at noon',
            activities: [
              {
                id: 'a1',
                title: 'Eiffel Tower',
                time: '18:00',
                location: 'Paris',
                notes: '',
                category: 'sightseeing',
                url: null,
              },
            ],
          },
          { id: 'd2', date: '2026-05-02', notes: '', activities: [] },
          { id: 'd3', date: '2026-05-03', notes: '', activities: [] },
        ],
      }),
    ]);
    renderRoute('/trips/abc/budget');
    expect(screen.queryByRole('article', { name: /Printable summary/ })).not.toBeInTheDocument();
    // Without the summary the page itself stays printable (some browsers skip `beforeprint`).
    const allTrips = screen.getByRole('link', { name: /All trips/ });
    const hiddenInPrint = '[class~="print:hidden"]';
    expect(allTrips.closest(hiddenInPrint)).toBeNull();

    act(() => window.dispatchEvent(new Event('beforeprint')));
    expect(allTrips.closest(hiddenInPrint)).not.toBeNull();
    const summary = screen.getByRole('article', { name: 'Printable summary of Paris getaway' });
    expect(summary).toHaveTextContent('Day 1');
    expect(summary).toHaveTextContent('Arrive at noon');
    expect(summary).toHaveTextContent('18:00Eiffel Tower (Sightseeing) · Paris');
    expect(summary).toHaveTextContent('Nothing planned.');
    expect(summary).toHaveTextContent(/Budget €500\.00 · Spent €60\.00 · Remaining €440\.00/);
    expect(within(summary).getByRole('table')).toHaveTextContent('Dinner');
    expect(summary).toHaveTextContent('Hotel booking (Hotel): https://hotel.example/x');

    act(() => window.dispatchEvent(new Event('afterprint')));
    expect(screen.queryByRole('article', { name: /Printable summary/ })).not.toBeInTheDocument();
  });
});
