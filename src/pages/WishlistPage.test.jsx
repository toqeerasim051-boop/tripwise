import { screen, within } from '@testing-library/react';
import { renderRoute } from '../test/renderRoute.jsx';
import { allCountries } from '../test/fixtures.js';
import { getAllCountries } from '../services/restCountries.js';

vi.mock('../services/restCountries.js', () => ({
  getAllCountries: vi.fn(),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));

const KEY = 'tripwise:v1:wishlist';
const AT = '2026-10-27T12:00:00.000Z';

function storeWishlist(data) {
  localStorage.setItem(KEY, JSON.stringify({ version: 1, data }));
}

beforeEach(() => {
  localStorage.clear();
  getAllCountries.mockResolvedValue(allCountries);
});

describe('WishlistPage', () => {
  it('shows an empty state with a link to Explore', async () => {
    renderRoute('/wishlist');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Your wishlist is empty' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore destinations' })).toHaveAttribute('href', '/');
  });

  it('lists saved countries newest first, with plan-a-trip links', async () => {
    storeWishlist([
      { countryCode: 'JPN', addedAt: AT },
      { countryCode: 'FRA', addedAt: AT },
    ]);
    renderRoute('/wishlist');

    expect(screen.getByText(/2 saved destinations/)).toBeInTheDocument();
    const cards = await screen.findAllByRole('article');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'Japan',
      'France',
    ]);
    expect(screen.getByRole('link', { name: 'Plan a trip to France' })).toHaveAttribute(
      'href',
      '/trips/new?country=FRA',
    );
    expect(screen.getByRole('link', { name: 'Wishlist (2 saved)' })).toBeInTheDocument();
  });

  it('removes items and persists the change', async () => {
    storeWishlist([{ countryCode: 'FRA', addedAt: AT }]);
    const { user } = renderRoute('/wishlist');

    await user.click(await screen.findByRole('button', { name: 'Remove France from wishlist' }));

    expect(screen.getByText('Your wishlist is empty')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(KEY)).data).toEqual([]);
  });

  it('handles codes that no longer exist and ignores corrupt entries', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    storeWishlist([{ countryCode: 'ZZZ', addedAt: AT }, { countryCode: 42 }]);
    const { user } = renderRoute('/wishlist');

    expect(await screen.findByText('Unknown country (ZZZ)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove ZZZ from wishlist' }));
    expect(screen.getByText('Your wishlist is empty')).toBeInTheDocument();
  });

  it('syncs changes made in another tab', async () => {
    renderRoute('/wishlist');
    const newValue = JSON.stringify({ version: 1, data: [{ countryCode: 'DEU', addedAt: AT }] });

    window.dispatchEvent(
      new StorageEvent('storage', { key: KEY, newValue, storageArea: localStorage }),
    );

    expect(await screen.findByRole('heading', { name: 'Germany' })).toBeInTheDocument();
  });

  it('warns persistently when changes cannot be saved', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    const { user } = renderRoute('/');
    await user.click(await screen.findByRole('button', { name: 'Save Japan to wishlist' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Changes not saved.*storage for TripWise is full/,
    );

    setItem.mockRestore();
    await user.click(screen.getByRole('button', { name: 'Remove Japan from wishlist' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
