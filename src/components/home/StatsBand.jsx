import { useCountUp } from '../../hooks/useCountUp.js';

function Stat({ value, prefix = '', suffix = '', label }) {
  const [ref, current] = useCountUp(value);
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1 text-sm text-on-scrim/80">{label}</dt>
      <dd className="font-display text-4xl font-bold text-on-scrim-accent lining-nums tabular-nums sm:text-5xl">
        {/* The counting number is visual only; screen readers get the final value. */}
        <span ref={ref} aria-hidden="true">
          {prefix}
          {current}
          {suffix}
        </span>
        <span className="sr-only">
          {prefix}
          {value}
          {suffix}
        </span>
      </dd>
    </div>
  );
}

/**
 * Key numbers in a dark band; each counts up from 0 when it scrolls into view.
 * `stats`: [{ value (number), prefix?, suffix?, label }] (all real, computed by the page).
 */
export default function StatsBand({ stats }) {
  return (
    <section aria-label="TripWise in numbers" className="mt-20 rounded-3xl bg-scrim px-6 py-10">
      <dl className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </dl>
    </section>
  );
}
