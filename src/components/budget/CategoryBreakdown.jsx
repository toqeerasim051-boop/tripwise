import { formatMoney } from '../../utils/money.js';

function formatShare(share) {
  const percent = share * 100;
  return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`;
}

/**
 * Spending per category as a ranked bar list. One series, so one colour (primary) and no legend;
 * every row states its category, amount and share in text, so the bars are decorative and the
 * list itself is the table view. Bars are scaled to total spending (part-to-whole).
 */
export default function CategoryBreakdown({ rows, currency }) {
  return (
    <ul role="list" className="grid gap-3">
      {rows.map((row) => (
        <li key={row.category}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-fg">{row.label}</span>
            <span className="text-fg tabular-nums">
              {formatMoney(row.cents, currency)}{' '}
              <span className="text-fg-muted">· {formatShare(row.share)}</span>
            </span>
          </div>
          <div aria-hidden="true" className="mt-1 h-3 rounded-[4px] bg-surface-muted">
            <div
              className="h-full rounded-r-[4px] bg-primary"
              style={{ width: `${row.share * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
