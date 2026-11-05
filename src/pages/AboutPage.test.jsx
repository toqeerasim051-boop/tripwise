import { screen, within } from '@testing-library/react';
import { renderRoute } from '../test/renderRoute.jsx';
import { eiffelTower } from '../test/fixtures.js';
import { getAllAttractions } from '../services/attractions.js';

vi.mock('../services/restCountries.js', () => ({
  getAllCountries: vi.fn(async () => []),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));

describe('AboutPage', () => {
  it('lists the data sources and every photo with its photographer and licence', async () => {
    renderRoute('/about');

    const sources = screen.getByRole('region', { name: 'Data sources' });
    ['REST Countries', 'Open-Meteo', 'Wikipedia', 'Wikimedia Commons'].forEach((name) =>
      expect(
        within(sources).getByRole('link', { name: `${name} (opens external site)` }),
      ).toBeInTheDocument(),
    );

    const photos = screen.getByRole('region', { name: 'Photo credits' });
    const items = await within(photos).findAllByRole('listitem');
    // The hero and slideshow photos, then Eiffel Tower. The Louvre fixture has no photo.
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Moraine Lake (homepage)');
    expect(items[1]).toHaveTextContent('Mount Fuji (homepage)');
    expect(items[2]).toHaveTextContent('Eiffel Tower');
    expect(items[2]).toHaveTextContent('A. Photographer · CC BY-SA 4.0');
    expect(
      within(items[2]).getByRole('link', { name: 'Eiffel Tower (opens external site)' }),
    ).toHaveAttribute('href', eiffelTower.image.credit.filePage);
  });

  it('shows an error with retry when the credits data cannot load', async () => {
    getAllAttractions.mockRejectedValueOnce(new Error('chunk failed'));
    const { user } = renderRoute('/about');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load photo credits");
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Eiffel Tower')).toBeInTheDocument();
  });
});
