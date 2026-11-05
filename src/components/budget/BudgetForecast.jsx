import { AlertIcon } from '../common/Icons.jsx';
import { formatMoney } from '../../utils/money.js';
import { pluralize } from '../../utils/formatters.js';

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted/50 p-4">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="mt-2 font-display text-2xl font-bold text-fg lining-nums tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function Note({ warn, children }) {
  return (
    <p
      className={`mt-3 flex items-start gap-1.5 text-sm ${warn ? 'font-medium text-fg' : 'text-fg-muted'}`}
    >
      {warn && <AlertIcon className="mt-0.5 size-4 shrink-0 text-danger" />}
      <span>{children}</span>
    </p>
  );
}

/** Spending pace, projected total and a daily allowance (see getBudgetForecast). */
export default function BudgetForecast({ forecast, currency }) {
  const money = (cents) => formatMoney(cents, currency);
  const { phase, daysLeft, dailyAllowanceCents } = forecast;
  const allowanceLabel = phase === 'before' ? 'Per trip day' : 'Per day from today';
  const nothingLeft = dailyAllowanceCents === 0;

  return (
    <div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <StatTile label={allowanceLabel} value={money(dailyAllowanceCents)} />
        {phase === 'during' && (
          <>
            <StatTile label="Spending pace" value={`${money(forecast.dailyPaceCents)} / day`} />
            <StatTile label="Projected total" value={money(forecast.projectedCents)} />
          </>
        )}
      </dl>

      {phase === 'before' && (
        <Note warn={nothingLeft}>
          {nothingLeft
            ? 'Your bookings already use the whole budget.'
            : `Your trip starts in ${pluralize(forecast.daysUntilStart, 'day')}. You can spend about ${money(dailyAllowanceCents)} on each of its ${pluralize(daysLeft, 'day')}.`}
        </Note>
      )}

      {phase === 'during' && (
        <>
          <Note warn={forecast.projectedOverCents > 0}>
            {forecast.dailyPaceCents === 0
              ? 'No spending logged on trip days yet.'
              : forecast.projectedOverCents > 0
                ? `At this pace you will go over budget by ${money(forecast.projectedOverCents)}.`
                : `At this pace you will stay ${money(-forecast.projectedOverCents)} under budget.`}
          </Note>
          <Note warn={nothingLeft}>
            {nothingLeft
              ? 'You have used the whole budget.'
              : `To stay on budget, spend up to ${money(dailyAllowanceCents)} a day for the last ${pluralize(daysLeft, 'day')} (today included).`}
          </Note>
        </>
      )}
    </div>
  );
}
