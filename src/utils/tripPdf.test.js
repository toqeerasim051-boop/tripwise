// @vitest-environment node
import { jsPDF } from 'jspdf';
import { createTripPdf, toPdfText, tripPdfFileName } from './tripPdf.js';
import { makeTrip } from '../test/fixtures.js';

const trip = makeTrip({
  title: 'Paris getaway',
  budget: { totalCents: 500_00 },
  expenses: [
    { id: 'e1', category: 'food', description: 'Dinner', amountCents: 60_00, date: '2026-05-01' },
  ],
  savedLinks: [
    { id: 'l1', type: 'hotel', label: 'Hotel booking', url: 'https://hotel.example/x' },
    { id: 'l2', type: 'other', label: 'Odd link', url: 'javascript:alert(1)' },
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
          notes: 'Book tickets',
          category: 'sightseeing',
          url: null,
        },
      ],
    },
    { id: 'd2', date: '2026-05-02', notes: '', activities: [] },
  ],
});

describe('createTripPdf', () => {
  // jsPDF doesn't compress by default, so the page text is readable in the raw output.
  const output = createTripPdf(trip, jsPDF, '2026-04-01').output();

  it('contains the itinerary, budget and expenses', () => {
    for (const text of [
      'Paris getaway',
      'Itinerary',
      'Day 1',
      'Arrive at noon',
      '18:00',
      'Eiffel Tower',
      'Book tickets',
      'Nothing planned.',
      'Budget',
      '500.00',
      'Dinner',
      'page 1 of 1',
    ]) {
      expect(output).toContain(text);
    }
  });

  it('links only safe saved links', () => {
    expect(output).toContain('/URI (https://hotel.example/x)');
    expect(output).toContain('Odd link');
    expect(output).not.toMatch(/\/URI \(javascript:/);
  });

  it('puts the link box over the link text', () => {
    const texts = [];
    const links = [];
    // jsPDF's constructor returns its own object, so wrap the instance instead of subclassing.
    function SpyPdf(options) {
      const doc = new jsPDF(options);
      const { text, link } = doc;
      doc.text = (value, x, y, ...rest) => {
        texts.push({ text: value, y });
        return text.call(doc, value, x, y, ...rest);
      };
      doc.link = (x, y, width, height, linkOptions) => {
        links.push({ y, height, url: linkOptions.url });
        return link.call(doc, x, y, width, height, linkOptions);
      };
      return doc;
    }
    createTripPdf(trip, SpyPdf, '2026-04-01');

    expect(links).toHaveLength(1);
    const [link] = links;
    expect(link.url).toBe('https://hotel.example/x');
    // The text is drawn top-aligned at y, so the box must start there too (not a line higher).
    expect(link.y).toBe(texts.find(({ text }) => text === 'https://hotel.example/x').y);
    expect(link.height).toBeGreaterThan(0);
  });

  it('uses Latin digits even for locales with other digits', () => {
    const resolved = Intl.DateTimeFormat.prototype.resolvedOptions;
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(function () {
      return { ...resolved.call(this), locale: 'ar-EG' };
    });
    const arabic = createTripPdf(trip, jsPDF, '2026-04-01').output();

    expect(arabic).toMatch(/500\.00\sEUR/); // Intl puts a no-break space before the code
    expect(arabic).not.toMatch(/\?500/);
  });

  it('adds pages for long trips, with a footer on each', () => {
    const days = Array.from({ length: 40 }, (_, index) => ({
      id: `d${index}`,
      date: '2026-05-01',
      notes: '',
      activities: [],
    }));
    const doc = createTripPdf({ ...trip, days }, jsPDF, '2026-04-01');
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(doc.output()).toContain(`page ${doc.getNumberOfPages()} of ${doc.getNumberOfPages()}`);
  });
});

describe('tripPdfFileName', () => {
  it('makes a safe file name from the trip title', () => {
    expect(tripPdfFileName('Rome & Florence')).toBe('Rome-and-Florence-trip-plan.pdf');
    expect(tripPdfFileName('Côte d’Ivoire 2026!')).toBe('Cote-d-Ivoire-2026-trip-plan.pdf');
    expect(tripPdfFileName('東京')).toBe('trip-trip-plan.pdf');
  });
});

describe('toPdfText', () => {
  it('keeps what the PDF font can show and replaces the rest', () => {
    expect(toPdfText('Café · €10 – “ok”')).toBe('Café · €10 – “ok”');
    expect(toPdfText(`10${String.fromCharCode(0x202f)}000 ₹`)).toBe('10 000 ?');
    expect(toPdfText(null)).toBe('');
  });

  it('turns tabs and Windows line endings into plain text, and drops direction marks', () => {
    const [CR, LF, TAB] = [13, 10, 9].map((code) => String.fromCharCode(code));
    expect(toPdfText(`Line 1${CR}${LF}Line 2${TAB}end`)).toBe(`Line 1${LF}Line 2 end`);
    expect(toPdfText(`${String.fromCharCode(0x200f)}1,500.00 EUR`)).toBe('1,500.00 EUR');
  });
});
