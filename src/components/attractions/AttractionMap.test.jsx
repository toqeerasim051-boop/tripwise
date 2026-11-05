import { fireEvent, render, screen, within } from '@testing-library/react';
import AttractionMap from './AttractionMap.jsx';
import AttractionMapLoader from './AttractionMapLoader.jsx';
import { eiffelTower, louvre } from '../../test/fixtures.js';

afterEach(() => vi.unstubAllGlobals());

// jsdom has no layout, so every element is 0×0 and Leaflet can't turn clicks into positions.
// Give elements a size, as a browser would for the map box.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300);
});

describe('AttractionMap', () => {
  it('shows a named pin per attraction and the OpenStreetMap credit', () => {
    render(<AttractionMap attractions={[eiffelTower, louvre]} onAdd={() => {}} />);

    expect(screen.getByRole('button', { name: 'Eiffel Tower, Paris' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Louvre/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    );
  });

  // Plain click events: user-event's pointer events have no position, which Leaflet needs.
  it('opens a popup with the photo and an Add to trip button', () => {
    const onAdd = vi.fn();
    const { container } = render(<AttractionMap attractions={[eiffelTower]} onAdd={onAdd} />);

    fireEvent.click(screen.getByRole('button', { name: 'Eiffel Tower, Paris' }));
    const popup = container.querySelector('.leaflet-popup');
    expect(popup).not.toBeNull();
    expect(within(popup).getByText('Eiffel Tower', { selector: 'p' })).toBeInTheDocument();

    fireEvent.click(within(popup).getByRole('button', { name: 'Add Eiffel Tower to trip' }));
    expect(onAdd).toHaveBeenCalledWith(eiffelTower);
  });
});

describe('AttractionMapLoader', () => {
  it('waits until the map is near the screen before loading it', async () => {
    let notify;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    render(
      <AttractionMapLoader attractions={[eiffelTower]} countryName="France" onAdd={() => {}} />,
    );
    expect(screen.getByText(/Where the top attractions in France are/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eiffel Tower, Paris' })).not.toBeInTheDocument();

    notify([{ isIntersecting: true }]);
    expect(await screen.findByRole('button', { name: 'Eiffel Tower, Paris' })).toBeInTheDocument();
  });

  const noCoords = { ...louvre, id: 'no-coords', name: 'Somewhere', lat: null, lon: null };

  it('pins only attractions with coordinates', async () => {
    render(
      <AttractionMapLoader
        attractions={[eiffelTower, noCoords]}
        countryName="France"
        onAdd={() => {}}
      />,
    );
    expect(await screen.findByRole('button', { name: 'Eiffel Tower, Paris' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Somewhere/ })).not.toBeInTheDocument();
  });

  it('starts watching once attractions with coordinates arrive', async () => {
    let notify;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const props = { countryName: 'France', onAdd: () => {} };
    const { rerender } = render(<AttractionMapLoader attractions={[noCoords]} {...props} />);
    expect(notify).toBeUndefined();

    rerender(<AttractionMapLoader attractions={[eiffelTower]} {...props} />);
    notify([{ isIntersecting: true }]);
    expect(await screen.findByRole('button', { name: 'Eiffel Tower, Paris' })).toBeInTheDocument();
  });

  it('shows no map when no attraction has coordinates', () => {
    const { container } = render(
      <AttractionMapLoader attractions={[noCoords]} countryName="France" onAdd={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
