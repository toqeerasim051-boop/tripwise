import { AlertIcon, PiggyBankIcon, ReceiptIcon, WalletIcon } from '../common/Icons.jsx';
import { formatMoney } from '../../utils/money.js';

// Traffic-light meter: green while there is room, orange from 75% used, red when over.
const METER = {
  ok: { track: 'bg-success/20', fill: 'bg-success' },
  warning: { track: 'bg-meter-warning/20', fill: 'bg-meter-warning' },
  over: { track: 'bg-danger/20', fill: 'bg-danger' },
};

function StatTile({ label, value, Icon, emphasis }) {
  const TileIcon = emphasis ? AlertIcon : Icon;
  return (
    <div className="rounded-xl border border-line bg-surface-muted/50 p-4">
      <dt
        className={`flex items-center gap-2 text-sm ${emphasis ? 'font-semibold text-danger' : 'text-fg-muted'}`}
      >
        <span
          className={`grid size-8 place-items-center rounded-full ${emphasis ? 'bg-danger/15' : 'bg-primary-soft text-primary'}`}
        >
          <TileIcon className="size-3.5" />
        </span>
        {label}
      </dt>
      <dd className="mt-2 font-display text-2xl font-bold text-fg lining-nums tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function statusText(summary, money) {
  const percent = Math.round((summary.usedRatio ?? 0) * 100);
  switch (summary.status) {
    case 'over':
      return `Over budget by ${money(-summary.remainingCents)}.`;
    case 'warning':
      return `Almost at your budget: ${percent}% used, ${money(summary.remainingCents)} left.`;
    case 'ok':
      return `${percent}% of your budget used, ${money(summary.remainingCents)} left.`;
    default:
      return 'No budget set yet. Set one to see how much is left.';
  }
}

/**
 * Budget / spent / remaining tiles and a meter. The meter is decorative (aria-hidden): its
 * state is always spelled out in the status sentence, with an icon when it needs attention.
 */
export default function BudgetSummary({ summary, currency, showDailyBudget = true }) {
  const money = (cents) => formatMoney(cents, currency);
  const isOver = summary.status === 'over';
  const needsAttention = summary.status === 'over' || summary.status === 'warning';
  const meter = METER[summary.status];

  return (
    <div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Budget"
          value={summary.hasBudget ? money(summary.budgetCents) : '—'}
          Icon={WalletIcon}
        />
        <StatTile label="Spent" value={money(summary.spentCents)} Icon={ReceiptIcon} />
        <StatTile
          label={isOver ? 'Over budget' : 'Remaining'}
          Icon={PiggyBankIcon}
          value={summary.hasBudget ? money(Math.abs(summary.remainingCents)) : '—'}
          emphasis={isOver}
        />
      </dl>

      {meter && (
        <div
          aria-hidden="true"
          className={`mt-4 h-3 overflow-hidden rounded-r-[4px] ${meter.track}`}
        >
          <div
            className={`h-full rounded-r-[4px] ${meter.fill}`}
            style={{ width: `${Math.min(summary.usedRatio, 1) * 100}%` }}
          />
        </div>
      )}

      <p
        className={`mt-3 flex items-start gap-1.5 text-sm ${needsAttention ? 'font-medium text-fg' : 'text-fg-muted'}`}
      >
        {needsAttention && (
          <AlertIcon
            className={`mt-0.5 size-4 shrink-0 ${isOver ? 'text-danger' : 'text-warning'}`}
          />
        )}
        <span>{statusText(summary, money)}</span>
      </p>
      {showDailyBudget && summary.dailyBudgetCents !== null && (
        <p className="mt-1 text-sm text-fg-muted">
          That&apos;s about {money(summary.dailyBudgetCents)} per day.
        </p>
      )}
    </div>
  );
}
