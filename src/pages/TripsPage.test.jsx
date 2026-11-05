import { screen, within } from '@testing-library/react';
import { renderRoute } from '../test/renderRoute.jsx';
import { makeTrip, readStoredTrips, storeTrips } from '../test/fixtures.js';

vi.mock('../services/restCountries.js', () => ({
  getAllCountries: vi.fn(async () => []),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));

beforeEach(() => localStorage.clear());

const cardTitles = () =>
  screen.getAllByRole('article').map((card) => within(card).getByRole('heading').textContent);

describe('TripsPage', () => {
  it('shows an empty state with ways to start', () => {
    renderRoute('/trips');
    expect(screen.getByRole('heading', { name: 'No trips yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan a trip' })).toHaveAttribute('href', '/trips/new');
    expect(screen.getByRole('link', { name: 'Open wishlist' })).toHaveAttribute(
      'href',
      '/wishlist',
    );
  });

  it('lists trips most recently edited first with their details', () => {
    const older = makeTrip({ id: 'old', title: 'Old trip', updatedAt: '2026-01-01T00:00:00.000Z' });
    const newer = makeTrip({ id: 'new', title: 'New trip', updatedAt: '2026-06-01T00:00:00.000Z' });
    newer.days[0].activities = [
      { id: 'a', title: 'Louvre', time: null, location: '', notes: '', category: 'other', url: '' },
    ];
    storeTrips([older, newer]);
    renderRoute('/trips');

    expect(screen.getByText('2 saved trips, most recently edited first.')).toBeInTheDocument();
    expect(cardTitles()).toEqual(['New trip', 'Old trip']);
    const card = screen.getAllByRole('article')[0];
    expect(within(card).getByRole('link', { name: 'New trip' })).toHaveAttribute(
      'href',
      '/trips/new',
    );
    expect(card).toHaveTextContent('France');
    expect(card).toHaveTextContent('3 days');
    expect(card).toHaveTextContent('1 activity');
    expect(within(card).getByRole('link', { name: 'Edit New trip' })).toHaveAttribute(
      'href',
      '/trips/new/edit',
    );
  });

  it('deletes a trip after confirmation and announces it', async () => {
    storeTrips([
      makeTrip({ id: 'a', title: 'Keep me' }),
      makeTrip({ id: 'b', title: 'Remove me' }),
    ]);
    const { user } = renderRoute('/trips');

    await user.click(screen.getByRole('button', { name: 'Delete Remove me' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete “Remove me”?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete trip' }));

    expect(cardTitles()).toEqual(['Keep me']);
    expect(screen.getByRole('status')).toHaveTextContent('Deleted “Remove me”.');
    expect(readStoredTrips().map((trip) => trip.id)).toEqual(['a']);
  });

  it('keeps the trip when deletion is cancelled', async () => {
    storeTrips([makeTrip({ id: 'a', title: 'Keep me' })]);
    const { user } = renderRoute('/trips');

    await user.click(screen.getByRole('button', { name: 'Delete Keep me' }));
    await user.keyboard('{Escape}');

    expect(cardTitles()).toEqual(['Keep me']);
    expect(screen.getByRole('button', { name: 'Delete Keep me' })).toHaveFocus();
  });

  it('syncs trips created in another tab', async () => {
    renderRoute('/trips');
    const newValue = JSON.stringify({ version: 1, data: [makeTrip({ title: 'From tab B' })] });

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'tripwise:v1:trips',
        newValue,
        storageArea: localStorage,
      }),
    );

    expect(await screen.findByRole('link', { name: 'From tab B' })).toBeInTheDocument();
  });
});

describe('TripsPage — backup', () => {
  const backupFile = (content, name = 'backup.json') =>
    new File([typeof content === 'string' ? content : JSON.stringify(content)], name, {
      type: 'application/json',
    });

  it('exports trips and wishlist to a JSON file', async () => {
    storeTrips([makeTrip({ id: 'a', title: 'Paris' })]);
    localStorage.setItem(
      'tripwise:v1:wishlist',
      JSON.stringify({
        version: 1,
        data: [{ countryCode: 'JPN', addedAt: '2026-10-01T00:00:00.000Z' }],
      }),
    );
    URL.createObjectURL = vi.fn(() => 'blob:backup');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user } = renderRoute('/trips');

    await user.click(screen.getByRole('button', { name: 'Export to file' }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.contexts[0].download).toMatch(/^tripwise-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const backup = JSON.parse(await URL.createObjectURL.mock.calls[0][0].text());
    expect(backup).toMatchObject({ app: 'TripWise', version: 1 });
    expect(backup.trips.map((trip) => trip.title)).toEqual(['Paris']);
    expect(backup.wishlist).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Exported 1 trip and 1 wishlist destination to tripwise-backup-',
    );
  });

  it('imports a backup, adding its trips and wishlist destinations', async () => {
    storeTrips([makeTrip({ id: 'a', title: 'Paris' })]);
    const { user } = renderRoute('/trips');

    await user.upload(
      screen.getByLabelText('Backup file'),
      backupFile({
        app: 'TripWise',
        version: 1,
        trips: [makeTrip({ id: 'b', title: 'Tokyo' })],
        wishlist: [{ countryCode: 'JPN', addedAt: '2026-10-01T00:00:00.000Z' }],
      }),
    );

    expect(
      await screen.findByText('Imported 1 trip and 1 wishlist destination from backup.json.'),
    ).toBeInTheDocument();
    expect(cardTitles().sort()).toEqual(['Paris', 'Tokyo']);
    expect(readStoredTrips()).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Wishlist (1 saved)' })).toBeInTheDocument();
  });

  it('explains why a file cannot be imported and changes nothing', async () => {
    storeTrips([makeTrip({ id: 'a', title: 'Paris' })]);
    const { user } = renderRoute('/trips');

    await user.upload(screen.getByLabelText('Backup file'), backupFile('{"app":"Other"}'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This file isn't a TripWise backup.",
    );
    expect(cardTitles()).toEqual(['Paris']);
  });
});
