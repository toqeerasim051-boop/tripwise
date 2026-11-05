import { renderHook, waitFor } from '@testing-library/react';
import { useCountry, useNeighbours } from './useCountries.js';
import { getCountry, getNeighbours } from '../services/restCountries.js';
import { getCuratedCountry, getSnapshotNeighbours } from '../services/attractions.js';
import { belgium, franceDetail, germany } from '../test/fixtures.js';

vi.mock('../services/restCountries.js', () => ({
  getAllCountries: vi.fn(),
  getCountry: vi.fn(async () => franceDetail),
  getNeighbours: vi.fn(async () => [belgium, germany]),
}));

describe('useCountry', () => {
  it('returns a curated country from the snapshot at once, with no request', () => {
    getCuratedCountry.mockReturnValue(franceDetail);
    const { result } = renderHook(() => useCountry('fra'));

    expect(result.current).toMatchObject({ status: 'success', data: franceDetail });
    expect(getCountry).not.toHaveBeenCalled();
  });

  it('loads other countries from REST Countries', async () => {
    getCuratedCountry.mockReturnValue(null);
    const { result } = renderHook(() => useCountry('fra'));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(getCountry).toHaveBeenCalledWith('FRA', expect.anything());
  });
});

describe('useNeighbours', () => {
  it('uses the snapshot when it knows every neighbour', () => {
    getSnapshotNeighbours.mockReturnValue([belgium, germany]);
    const { result } = renderHook(() => useNeighbours(['BEL', 'DEU']));

    expect(result.current).toMatchObject({ status: 'success', data: [belgium, germany] });
    expect(getNeighbours).not.toHaveBeenCalled();
  });

  it('asks REST Countries otherwise', async () => {
    getSnapshotNeighbours.mockReturnValue(null);
    const { result } = renderHook(() => useNeighbours(['BEL', 'DEU']));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(getNeighbours).toHaveBeenCalledWith(['BEL', 'DEU'], expect.anything());
  });
});
