// @vitest-environment node
import {
  buildWidgetDocument,
  fillWidgetUrl,
  getPartnerWidgets,
  WIDGET_MESSAGE_SOURCE,
  widgetValuesFor,
} from './partnerWidgets.js';
import { makeTrip } from '../test/fixtures.js';

describe('getPartnerWidgets', () => {
  it('returns configured widgets in hotel, flight, activity order', () => {
    const env = {
      VITE_PARTNER_WIDGET_ACTIVITY: ' https://widgets.example/a.js?q={query} ',
      VITE_PARTNER_WIDGET_HOTEL: 'https://widgets.example/h.js',
    };
    expect(getPartnerWidgets(env)).toEqual([
      { type: 'hotel', title: 'Hotels', template: 'https://widgets.example/h.js' },
      { type: 'activity', title: 'Activities', template: 'https://widgets.example/a.js?q={query}' },
    ]);
  });

  it('returns nothing when no widget is configured', () => {
    expect(getPartnerWidgets({})).toEqual([]);
    expect(getPartnerWidgets({ VITE_PARTNER_WIDGET_HOTEL: '  ' })).toEqual([]);
  });

  it('ignores URLs that are not https', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      getPartnerWidgets({
        VITE_PARTNER_WIDGET_HOTEL: 'http://widgets.example/h.js',
        VITE_PARTNER_WIDGET_FLIGHT: 'javascript:alert(1)',
        VITE_PARTNER_WIDGET_ACTIVITY: '<script src="x">',
      }),
    ).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(3);
  });
});

describe('widgetValuesFor / fillWidgetUrl', () => {
  const trip = makeTrip({ startDate: '2099-05-01', endDate: '2099-05-03', currency: 'EUR' });

  it('uses the search text, trip dates and currency', () => {
    expect(widgetValuesFor(trip, { query: ' Lyon ', today: '2026-10-27' })).toEqual({
      query: 'Lyon',
      checkin: '2099-05-01',
      checkout: '2099-05-03',
      currency: 'EUR',
    });
  });

  it('falls back to the destination and leaves dates empty once the trip has started', () => {
    expect(widgetValuesFor(trip, { query: '', today: '2099-05-02' })).toEqual({
      query: 'France',
      checkin: '',
      checkout: '',
      currency: 'EUR',
    });
  });

  it('fills known placeholders with encoded values and leaves the rest alone', () => {
    const template = 'https://w.example/s.js?city={query}&in={checkin}&cur={currency}&x={other}';
    expect(
      fillWidgetUrl(template, { query: 'São Paulo & co', checkin: '2099-05-01', currency: 'BRL' }),
    ).toBe(
      'https://w.example/s.js?city=S%C3%A3o%20Paulo%20%26%20co&in=2099-05-01&cur=BRL&x={other}',
    );
  });
});

describe('buildWidgetDocument', () => {
  it('embeds the escaped script URL after the height reporter', () => {
    const html = buildWidgetDocument('https://w.example/s.js?a=1&b="x"<y>');
    expect(html).toContain(
      '<script async charset="utf-8" src="https://w.example/s.js?a=1&amp;b=&quot;x&quot;&lt;y&gt;"',
    );
    expect(html).toContain(JSON.stringify(WIDGET_MESSAGE_SOURCE));
    expect(html.indexOf('ResizeObserver')).toBeLessThan(html.indexOf('w.example'));
    expect(html).toContain('<meta name="color-scheme" content="light">');
  });
});
