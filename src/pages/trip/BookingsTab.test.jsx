import { act, screen, within } from '@testing-library/react';
import { renderRoute } from '../../test/renderRoute.jsx';
import { makeTrip, readStoredTrips, storeTrips } from '../../test/fixtures.js';
import { WIDGET_MESSAGE_SOURCE, WIDGET_SANDBOX } from '../../utils/partnerWidgets.js';

vi.mock('../../services/restCountries.js', () => ({
  getAllCountries: vi.fn(async () => []),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));

const link = (id, label, extra = {}) => ({
  id,
  type: 'hotel',
  label,
  url: `https://${id}.example/booking`,
  ...extra,
});

function seed(overrides = {}) {
  storeTrips([
    makeTrip({ id: 'abc', startDate: '2099-05-01', endDate: '2099-05-03', ...overrides }),
  ]);
}

const region = (name) => screen.getByRole('region', { name });

beforeEach(() => localStorage.clear());

describe('BookingsTab — search form', () => {
  const searchButton = (name) =>
    screen.getByRole('button', { name: `Search ${name} (opens external site)` });
  const openedUrl = (open) => new URL(open.mock.calls.at(-1)[0]);

  it('is filled in from the trip and opens Booking.com in a new tab', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    seed();
    const { user } = renderRoute('/trips/abc/bookings');

    const search = region('Search and book');
    expect(search).toHaveTextContent('TripWise never makes reservations or takes payments.');
    expect(within(search).getByRole('radio', { name: 'Hotels' })).toBeChecked();
    expect(screen.getByLabelText('Destination')).toHaveValue('France');
    expect(screen.getByLabelText(/Check-in/)).toHaveValue('2099-05-01');
    expect(screen.getByLabelText(/Check-out/)).toHaveValue('2099-05-03');

    await user.clear(screen.getByLabelText('Destination'));
    await user.type(screen.getByLabelText('Destination'), 'Lyon');
    await user.clear(screen.getByLabelText('Adults'));
    await user.type(screen.getByLabelText('Adults'), '3');
    await user.click(searchButton('hotels on Booking.com'));

    expect(open).toHaveBeenCalledWith(expect.any(String), '_blank', 'noopener,noreferrer');
    const url = openedUrl(open);
    expect(url.origin + url.pathname).toBe('https://www.booking.com/searchresults.html');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      ss: 'Lyon',
      checkin: '2099-05-01',
      checkout: '2099-05-03',
      group_adults: '3',
      no_rooms: '1',
    });
  });

  it('searches flights from a city, and activities with only a destination', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    seed();
    const { user } = renderRoute('/trips/abc/bookings');

    await user.click(screen.getByRole('radio', { name: 'Flights' }));
    expect(screen.queryByLabelText('Adults')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/From/), 'London');
    await user.click(searchButton('flights on Google Flights'));
    expect(openedUrl(open).searchParams.get('q')).toBe(
      'Flights from London to France on 2099-05-01 through 2099-05-03',
    );

    await user.click(screen.getByRole('radio', { name: 'Activities' }));
    expect(screen.queryByLabelText(/Check-in|Depart/)).not.toBeInTheDocument();
    await user.click(searchButton('activities on GetYourGuide'));
    expect(openedUrl(open).href).toBe('https://www.getyourguide.com/s/?q=France');
  });

  it('shows errors next to the fields instead of searching', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    seed();
    const { user } = renderRoute('/trips/abc/bookings');

    const checkOut = screen.getByLabelText(/Check-out/);
    await user.clear(checkOut);
    await user.type(checkOut, '2099-04-30');
    await user.click(searchButton('hotels on Booking.com'));

    expect(open).not.toHaveBeenCalled();
    expect(checkOut).toHaveAttribute('aria-invalid', 'true');
    expect(checkOut).toHaveAccessibleDescription('Check-out must be after check-in.');
    expect(checkOut).toHaveFocus();
  });

  it('leaves the dates empty for past trips', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    seed({ startDate: '2020-05-01', endDate: '2020-05-03' });
    const { user } = renderRoute('/trips/abc/bookings');

    expect(screen.getByText(/trip dates have passed/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Check-in/)).toHaveValue('');
    await user.click(searchButton('hotels on Booking.com'));
    expect(openedUrl(open).searchParams.has('checkin')).toBe(false);
  });
});

describe('BookingsTab — saved links', () => {
  it('adds a link, normalising the address, and lists it as an external link', async () => {
    seed();
    const { user } = renderRoute('/trips/abc/bookings');

    await user.click(screen.getByRole('button', { name: 'Add link' }));
    const dialog = screen.getByRole('dialog', { name: 'Add link' });
    expect(within(dialog).getByLabelText('Label')).toHaveFocus();
    await user.type(within(dialog).getByLabelText('Label'), 'Hotel confirmation');
    await user.type(within(dialog).getByLabelText('Web address'), 'booking.com/conf/123');
    await user.click(within(dialog).getByRole('button', { name: 'Add link' }));

    const saved = region('Saved links');
    expect(
      within(saved).getByRole('link', { name: 'Hotel confirmation (opens external site)' }),
    ).toHaveAttribute('href', 'https://booking.com/conf/123');
    expect(within(saved).getByText('booking.com')).toBeInTheDocument();
    expect(readStoredTrips()[0].savedLinks).toEqual([
      {
        id: expect.any(String),
        type: 'hotel',
        label: 'Hotel confirmation',
        url: 'https://booking.com/conf/123',
      },
    ]);
  });

  it('rejects unsafe addresses', async () => {
    seed();
    const { user } = renderRoute('/trips/abc/bookings');

    await user.click(screen.getByRole('button', { name: 'Add link' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Label'), 'Trap');
    await user.type(within(dialog).getByLabelText('Web address'), 'javascript:alert(1)');
    await user.click(within(dialog).getByRole('button', { name: 'Add link' }));

    expect(within(dialog).getByText(/valid web address/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Web address')).toHaveFocus();
    expect(readStoredTrips()[0].savedLinks).toEqual([]);
  });

  it('edits a link', async () => {
    seed({ savedLinks: [link('a', 'Hotel')] });
    const { user } = renderRoute('/trips/abc/bookings');

    await user.click(screen.getByRole('button', { name: 'Edit Hotel' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit “Hotel”' });
    await user.selectOptions(within(dialog).getByLabelText('Type'), 'flight');
    await user.clear(within(dialog).getByLabelText('Label'));
    await user.type(within(dialog).getByLabelText('Label'), 'Flight to Paris');
    await user.click(within(dialog).getByRole('button', { name: 'Save link' }));

    expect(screen.getByRole('link', { name: /Flight to Paris/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Flight to Paris' })).toHaveFocus();
    expect(readStoredTrips()[0].savedLinks[0]).toMatchObject({ type: 'flight' });
  });

  it('deletes after confirmation, moving focus to the next link and then to Add', async () => {
    seed({ savedLinks: [link('a', 'Hotel'), link('b', 'Tickets')] });
    const { user } = renderRoute('/trips/abc/bookings');

    await user.click(screen.getByRole('button', { name: 'Delete Hotel' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete “Hotel”?' });
    expect(dialog).toHaveTextContent('Your booking itself is not affected.');
    await user.click(within(dialog).getByRole('button', { name: 'Delete link' }));

    expect(screen.getByRole('button', { name: 'Edit Tickets' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Delete Tickets' }));
    await user.click(screen.getByRole('button', { name: 'Delete link' }));
    expect(screen.getByRole('button', { name: 'Add link' })).toHaveFocus();
    expect(readStoredTrips()[0].savedLinks).toEqual([]);
  });
});

describe('BookingsTab — partner widgets', () => {
  const frame = (name) => screen.getByTitle(`${name} search by our travel partner`);
  const post = (iframe, data, source = iframe.contentWindow) =>
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { source: WIDGET_MESSAGE_SOURCE, ...data }, source }),
      );
    });

  it('shows only the search form, with no setup note, when no widget is configured', () => {
    seed();
    renderRoute('/trips/abc/bookings');
    expect(screen.queryByRole('group', { name: 'Search for' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Developer note|\.env/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Search hotels on Booking\.com/ }),
    ).toBeInTheDocument();
  });

  it('embeds configured widgets in a sandboxed frame with the trip filled in', async () => {
    vi.stubEnv(
      'VITE_PARTNER_WIDGET_HOTEL',
      'https://widgets.example/h.js?city={query}&in={checkin}',
    );
    vi.stubEnv('VITE_PARTNER_WIDGET_FLIGHT', 'https://widgets.example/f.js');
    seed();
    const { user } = renderRoute('/trips/abc/bookings');

    expect(region('Search and book')).toHaveTextContent(
      "You book and pay on the partner's site. TripWise never makes reservations or takes payments.",
    );
    const hotels = frame('Hotels');
    expect(hotels).toHaveAttribute('sandbox', WIDGET_SANDBOX);
    expect(hotels.getAttribute('sandbox')).not.toContain('allow-same-origin');
    expect(hotels.getAttribute('srcdoc')).toContain(
      'src="https://widgets.example/h.js?city=France&amp;in=2099-05-01"',
    );
    expect(screen.getByRole('heading', { name: 'Or search on these sites' })).toBeInTheDocument();
    expect(screen.queryByText(/Developer note/)).not.toBeInTheDocument();

    const widgetTypes = screen.getByRole('group', { name: 'Search for' });
    await user.click(within(widgetTypes).getByRole('radio', { name: 'Flights' }));
    expect(frame('Flights').getAttribute('srcdoc')).toContain('widgets.example/f.js');
    expect(screen.queryByTitle(/Hotels search/)).not.toBeInTheDocument();
  });

  it('sizes the frame from its own messages only and reports load failures', () => {
    vi.stubEnv('VITE_PARTNER_WIDGET_HOTEL', 'https://widgets.example/h.js');
    seed();
    renderRoute('/trips/abc/bookings');
    const hotels = frame('Hotels');
    expect(screen.getByText('Loading search…')).toBeInTheDocument();

    post(hotels, { type: 'height', height: 640 }, window);
    expect(hotels).toHaveStyle({ height: '420px' });
    post(hotels, { type: 'height', height: 640 });
    expect(hotels).toHaveStyle({ height: '640px' });
    post(hotels, { type: 'height', height: 99999 });
    expect(hotels).toHaveStyle({ height: '2400px' });

    post(hotels, { type: 'loaded' });
    expect(screen.queryByText('Loading search…')).not.toBeInTheDocument();

    post(hotels, { type: 'error' });
    expect(screen.getByText(/partner search couldn.t load/)).toBeInTheDocument();
    expect(screen.queryByTitle(/Hotels search/)).not.toBeInTheDocument();
  });
});
