// @vitest-environment node
import {
  buildSearchUrl,
  displayHost,
  getSearchDates,
  getSearchDefaults,
  isSafeUrl,
  normalizeUrl,
} from './bookingLinks.js';
import { makeTrip } from '../test/fixtures.js';

describe('isSafeUrl', () => {
  it.each([
    'https://www.booking.com/hotel/fr/x.html',
    'http://example.com',
    '  https://example.com/path?q=1  ',
    'HTTPS://EXAMPLE.COM',
  ])('accepts %s', (url) => {
    expect(isSafeUrl(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.com',
    'mailto:a@b.com',
    'example.com',
    '/relative/path',
    'https://',
    '',
    null,
    42,
  ])('rejects %s', (url) => {
    expect(isSafeUrl(url)).toBe(false);
  });
});

describe('normalizeUrl', () => {
  it('adds https:// to bare hosts', () => {
    expect(normalizeUrl(' booking.com/abc ')).toBe('https://booking.com/abc');
    expect(normalizeUrl('//example.com')).toBe('https://example.com');
  });

  it('leaves explicit schemes alone so isSafeUrl can reject unsafe ones', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeUrl('javascript:alert(1)')).toBe('javascript:alert(1)');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeUrl('  ')).toBe('');
    expect(normalizeUrl(undefined)).toBe('');
  });
});

describe('displayHost', () => {
  it('shows the host without www', () => {
    expect(displayHost('https://www.booking.com/x?y=1')).toBe('booking.com');
    expect(displayHost('not a url')).toBe('not a url');
  });
});

describe('buildSearchUrl', () => {
  const values = {
    where: ' Paris ',
    from: '',
    checkIn: '2026-05-01',
    checkOut: '2026-05-03',
    adults: '2',
    rooms: '1',
  };

  it('builds hotel, flight and activity searches from the form values', () => {
    const hotel = new URL(buildSearchUrl('hotel', values));
    expect(hotel.origin + hotel.pathname).toBe('https://www.booking.com/searchresults.html');
    expect(Object.fromEntries(hotel.searchParams)).toEqual({
      ss: 'Paris',
      checkin: '2026-05-01',
      checkout: '2026-05-03',
      group_adults: '2',
      no_rooms: '1',
    });
    expect(new URL(buildSearchUrl('flight', values)).searchParams.get('q')).toBe(
      'Flights to Paris on 2026-05-01 through 2026-05-03',
    );
    expect(new URL(buildSearchUrl('activity', values)).searchParams.get('q')).toBe('Paris');
    ['hotel', 'flight', 'activity'].forEach((type) =>
      expect(isSafeUrl(buildSearchUrl(type, values))).toBe(true),
    );
  });

  it('adds the departure city and handles one-way and dateless flights', () => {
    const q = (extra) =>
      new URL(buildSearchUrl('flight', { ...values, ...extra })).searchParams.get('q');
    expect(q({ from: ' London ' })).toBe(
      'Flights from London to Paris on 2026-05-01 through 2026-05-03',
    );
    expect(q({ checkOut: '' })).toBe('Flights to Paris on 2026-05-01');
    expect(q({ checkIn: '', checkOut: '' })).toBe('Flights to Paris');
  });

  it('leaves out empty values', () => {
    const hotel = new URL(buildSearchUrl('hotel', { where: 'Rome', checkIn: '', checkOut: '' }));
    expect(Object.fromEntries(hotel.searchParams)).toEqual({ ss: 'Rome' });
  });

  it('encodes user input safely', () => {
    const url = buildSearchUrl('hotel', { where: 'São Paulo & "x"<script>' });
    expect(new URL(url).searchParams.get('ss')).toBe('São Paulo & "x"<script>');
    expect(url).not.toContain('<script>');
  });
});

describe('getSearchDefaults', () => {
  it('fills in the destination, trip dates and 2 adults in 1 room', () => {
    const trip = makeTrip({
      destinationName: 'France',
      startDate: '2026-05-01',
      endDate: '2026-05-01',
    });
    expect(getSearchDefaults(trip, '2026-04-01')).toEqual({
      where: 'France',
      from: '',
      checkIn: '2026-05-01',
      checkOut: '2026-05-02',
      adults: '2',
      rooms: '1',
    });
  });

  it('leaves the dates empty once the trip has started', () => {
    const trip = makeTrip({ startDate: '2026-05-01', endDate: '2026-05-03' });
    expect(getSearchDefaults(trip, '2026-05-02')).toMatchObject({ checkIn: '', checkOut: '' });
  });
});

describe('getSearchDates', () => {
  const trip = makeTrip({ startDate: '2099-05-01', endDate: '2099-05-03' });

  it('includes the trip dates until the trip starts', () => {
    expect(getSearchDates(trip, '2099-05-01')).toEqual({
      includesDates: true,
      checkIn: '2099-05-01',
      checkOut: '2099-05-03',
    });
    expect(getSearchDates(trip, '2099-05-02')).toEqual({
      includesDates: false,
      checkIn: null,
      checkOut: null,
    });
  });

  it('checks out the next day for a same-day trip', () => {
    const dayTrip = makeTrip({ startDate: '2099-12-31', endDate: '2099-12-31' });
    expect(getSearchDates(dayTrip, '2099-01-01').checkOut).toBe('2100-01-01');
  });
});
