/**
 * Trip plan as a downloadable PDF (jsPDF, loaded only when the user asks for it). The content
 * matches TripPrintView: days and activities, budget and expenses, saved links.
 */
import { isSafeUrl } from './bookingLinks.js';
import {
  expenseCategoryLabel,
  expenseName,
  getBudgetSummary,
  getCategoryBreakdown,
  sortExpenses,
} from './budget.js';
import { formatDate, formatDateRange, todayIso, tripLengthInDays } from './dates.js';
import { pluralize } from './formatters.js';
import { activityCategoryLabel, dayLabel } from './itinerary.js';
import { linkTypeLabel } from './savedLinks.js';

// A4 in millimetres. Colours mirror tokens.css (light theme); the PDF can't read CSS variables.
const PAGE = { width: 210, height: 297, margin: 18 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const COLORS = {
  fg: [11, 37, 64],
  muted: [74, 93, 114],
  primary: [11, 116, 113],
  line: [217, 229, 238],
};
const PT_TO_MM = 0.3528;

// jsPDF's built-in Helvetica covers Windows-1252 only: normalise spaces and replace anything else.
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
export function toPdfText(value) {
  return Array.from(String(value ?? ''), (char) => {
    const code = char.charCodeAt(0);
    if (code === 13) return ''; // CRLF line endings -> LF
    if (code === 9) return ' '; // tab
    // Invisible direction marks (Intl adds them for right-to-left locales) -> nothing.
    if (code === 0x061c || code === 0x200e || code === 0x200f) return '';
    if ((code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)) return '';
    const latin1 = code === 10 || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);
    if (latin1 || WIN_ANSI_EXTRA.has(char)) return char;
    // Thin, narrow and other special spaces (Intl uses some in numbers) -> plain space.
    if ((code >= 0x2000 && code <= 0x200b) || code === 0x202f || code === 0x205f) return ' ';
    if (code === 0x2212) return '-'; // minus sign
    return '?';
  }).join('');
}

/** "Rome & Florence" -> "Rome-and-Florence-trip-plan.pdf" */
export function tripPdfFileName(title) {
  const slug = String(title ?? '')
    .replace(/&/g, ' and ')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'trip'}-trip-plan.pdf`;
}

// Money with the currency code ("EUR 1,500.00"): symbols such as ₹ or ₩ aren't in the PDF font.
function pdfMoney(cents, currency, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
  }).format(cents / 100);
}

// The user's locale, but always with Latin digits: Arabic-Indic or Bengali digits aren't in the font.
function pdfLocale() {
  try {
    const { locale } = new Intl.DateTimeFormat().resolvedOptions();
    return new Intl.Locale(locale, { numberingSystem: 'latn' }).toString();
  } catch {
    return 'en';
  }
}

/** Writes flowing text top to bottom, adding pages as needed. */
function createWriter(doc) {
  let y = PAGE.margin;

  function setStyle({ size = 10, style = 'normal', color = COLORS.fg }) {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    return size * PT_TO_MM * 1.35; // line height in mm
  }

  function ensureSpace(height) {
    if (y + height <= PAGE.height - PAGE.margin - 6) return;
    doc.addPage();
    y = PAGE.margin;
  }

  return {
    gap(mm) {
      y += mm;
    },
    /** Wrapped text at `x` (mm from the left margin), `width` wide. */
    text(value, { x = 0, width = CONTENT_WIDTH, after = 1.5, ...style } = {}) {
      const lineHeight = setStyle(style);
      const lines = doc.splitTextToSize(toPdfText(value), width);
      ensureSpace(lines.length * lineHeight);
      doc.text(lines, PAGE.margin + x, y, { baseline: 'top', lineHeightFactor: 1.35 });
      y += lines.length * lineHeight + after;
    },
    heading(value) {
      ensureSpace(14);
      y += 4;
      this.text(value, { size: 14, style: 'bold', color: COLORS.primary, after: 1 });
      doc.setDrawColor(...COLORS.line);
      doc.line(PAGE.margin, y, PAGE.margin + CONTENT_WIDTH, y);
      y += 3;
    },
    /** One row of cells: [{ value, x, width, align }], all starting on the same line. */
    row(cells, style = {}) {
      const lineHeight = setStyle(style);
      const wrapped = cells.map((cell) => doc.splitTextToSize(toPdfText(cell.value), cell.width));
      const height = Math.max(...wrapped.map((lines) => lines.length)) * lineHeight;
      ensureSpace(height);
      cells.forEach((cell, index) => {
        const right = cell.align === 'right';
        doc.text(wrapped[index], PAGE.margin + cell.x + (right ? cell.width : 0), y, {
          baseline: 'top',
          lineHeightFactor: 1.35,
          align: right ? 'right' : 'left',
        });
      });
      y += height + 1.2;
    },
    line() {
      doc.setDrawColor(...COLORS.line);
      doc.line(PAGE.margin, y, PAGE.margin + CONTENT_WIDTH, y);
      y += 1.5;
    },
    link(label, url) {
      const lineHeight = setStyle({ size: 9 });
      ensureSpace(lineHeight * 2);
      doc.setFont('helvetica', 'bold');
      doc.text(toPdfText(label), PAGE.margin, y, { baseline: 'top' });
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      // User-entered: clickable only if it is a safe http(s) address, as everywhere else.
      const safe = isSafeUrl(url);
      doc.setTextColor(...(safe ? COLORS.primary : COLORS.muted));
      doc.splitTextToSize(toPdfText(url), CONTENT_WIDTH).forEach((line) => {
        ensureSpace(lineHeight);
        doc.text(line, PAGE.margin, y, { baseline: 'top' });
        // Our own link box: textWithLink places it for a text baseline, a line above top-aligned text.
        if (safe) doc.link(PAGE.margin, y, doc.getTextWidth(line), lineHeight, { url });
        y += lineHeight;
      });
      y += 1.5;
    },
  };
}

/** Builds the trip plan. `JsPdf` is jsPDF's constructor (passed in, so tests needn't load it lazily). */
export function createTripPdf(trip, JsPdf, today = todayIso()) {
  const doc = new JsPdf({ unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: toPdfText(`${trip.title} - TripWise trip plan`),
    creator: 'TripWise',
  });
  const write = createWriter(doc);
  const locale = pdfLocale();
  const money = (cents) => pdfMoney(cents, trip.currency, locale);
  const length = tripLengthInDays(trip.startDate, trip.endDate);

  write.text('TripWise trip plan', { size: 9, color: COLORS.muted, after: 1 });
  write.text(trip.title, { size: 22, style: 'bold', after: 1 });
  write.text(
    [
      trip.destinationName,
      formatDateRange(trip.startDate, trip.endDate, undefined, locale),
      length && pluralize(length, 'day'),
    ]
      .filter(Boolean)
      .join(' · '),
    { size: 11, color: COLORS.muted },
  );

  write.heading('Itinerary');
  trip.days.forEach((day, index) => {
    write.text(
      `${dayLabel(index)} · ${formatDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' }, locale)}`,
      { size: 11, style: 'bold', after: 1 },
    );
    if (day.notes)
      write.text(day.notes, { size: 9, style: 'italic', color: COLORS.muted, after: 1 });
    if (day.activities.length === 0) {
      write.text('Nothing planned.', { size: 9, color: COLORS.muted });
    }
    day.activities.forEach((activity) => {
      const details = [activityCategoryLabel(activity.category), activity.location]
        .filter(Boolean)
        .join(' · ');
      write.row(
        [
          { value: activity.time ?? '–', x: 0, width: 14 },
          { value: `${activity.title} (${details})`, x: 16, width: CONTENT_WIDTH - 16 },
        ],
        { size: 10 },
      );
      if (activity.notes) {
        write.text(activity.notes, {
          x: 16,
          width: CONTENT_WIDTH - 16,
          size: 9,
          color: COLORS.muted,
        });
      }
    });
    write.gap(2.5);
  });

  write.heading('Budget');
  const summary = getBudgetSummary(trip);
  if (summary.hasBudget) {
    const rest =
      summary.remainingCents < 0
        ? `Over budget by ${money(-summary.remainingCents)}`
        : `Remaining ${money(summary.remainingCents)}`;
    write.text(
      `Budget ${money(summary.budgetCents)} · Spent ${money(summary.spentCents)} · ${rest}`,
      {
        size: 11,
      },
    );
  } else {
    write.text(`No budget set. Spent ${money(summary.spentCents)}.`, { size: 11 });
  }
  getCategoryBreakdown(trip.expenses).forEach((row) => {
    write.text(`${row.label}: ${money(row.cents)} (${Math.round(row.share * 100)}%)`, {
      size: 9,
      after: 0.5,
    });
  });
  if (trip.expenses.length > 0) {
    write.gap(3);
    const columns = (date, name, category, amount) => [
      { value: date, x: 0, width: 28 },
      { value: name, x: 30, width: 72 },
      { value: category, x: 104, width: 38 },
      { value: amount, x: 144, width: CONTENT_WIDTH - 144, align: 'right' },
    ];
    write.row(columns('Date', 'Expense', 'Category', 'Amount'), { size: 9, style: 'bold' });
    write.line();
    sortExpenses(trip.expenses).forEach((expense) => {
      write.row(
        columns(
          expense.date ? formatDate(expense.date, undefined, locale) : '–',
          expenseName(expense),
          expenseCategoryLabel(expense.category),
          money(expense.amountCents),
        ),
        { size: 9 },
      );
    });
  }

  if (trip.savedLinks.length > 0) {
    write.heading('Saved links');
    trip.savedLinks.forEach((link) => {
      write.link(`${link.label} (${linkTypeLabel(link.type)})`, link.url);
    });
  }

  // Footer on every page.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      toPdfText(
        `Planned with TripWise · ${formatDate(today, undefined, locale)} · page ${page} of ${pages}`,
      ),
      PAGE.margin,
      PAGE.height - PAGE.margin + 6,
    );
  }
  return doc;
}

/** Loads jsPDF (its own chunk), builds the trip plan and saves it to the user's downloads. */
export async function downloadTripPdf(trip) {
  const { jsPDF } = await import('jspdf');
  createTripPdf(trip, jsPDF).save(tripPdfFileName(trip.title));
}
