import Reveal from '../common/Reveal.jsx';
import Skeleton from '../common/Skeleton.jsx';

const GRID =
  'grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 md:grid-cols-3 min-[1050px]:grid-cols-4 lg:grid-cols-5';

/** Responsive list of cards. `renderItem(item)` returns the card for each item. */
export default function CountryGrid({ items, getKey, renderItem }) {
  return (
    <ul role="list" className={GRID}>
      {items.map((item, index) => (
        <Reveal as="li" key={getKey(item)} delay={(index % 5) * 80}>
          {renderItem(item)}
        </Reveal>
      ))}
    </ul>
  );
}

export function CountryGridSkeleton({ count = 8, label = 'Loading countries…' }) {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      <ul role="list" className={GRID}>
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <Skeleton className="aspect-4/3 rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
