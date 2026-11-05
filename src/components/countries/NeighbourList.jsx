import { Link } from 'react-router';

/** Neighbouring countries as links with small decorative flags. */
export default function NeighbourList({ countries }) {
  return (
    <ul role="list" className="flex flex-wrap gap-2">
      {countries.map((country) => (
        <li key={country.code}>
          <Link
            to={`/countries/${country.code}`}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm font-medium text-fg transition-colors hover:border-primary hover:text-primary"
          >
            {country.flagUrl ? (
              <img
                src={country.flagUrl}
                alt=""
                loading="lazy"
                className="h-5 w-7 rounded-sm border border-line object-cover"
              />
            ) : (
              <span className="h-5 w-7 rounded-sm bg-surface-muted" aria-hidden="true" />
            )}
            {country.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
