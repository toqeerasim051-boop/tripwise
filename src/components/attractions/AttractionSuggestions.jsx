import Photo from '../common/Photo.jsx';
import { PlusIcon } from '../common/Icons.jsx';
import { buttonStyles } from '../common/buttonStyles.js';

/** Compact list of a destination's top attractions, each with an "Add" action. */
export default function AttractionSuggestions({ countryName, attractions, onAdd }) {
  return (
    <section
      aria-labelledby="attraction-suggestions-heading"
      className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card"
    >
      <h3 id="attraction-suggestions-heading" className="text-base font-semibold text-fg">
        Top attractions in {countryName}
      </h3>
      <p className="mt-1 text-sm text-fg-muted">Add a famous sight to one of your days.</p>
      <ul role="list" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {attractions.map((attraction) => (
          <li
            key={attraction.id}
            className="flex items-center gap-3 rounded-xl border border-line p-2"
          >
            <Photo
              src={attraction.image?.src}
              alt=""
              className="size-16 shrink-0 rounded-lg bg-surface-muted"
              fallback={<div className="size-16 shrink-0 rounded-lg bg-surface-muted" />}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">{attraction.name}</p>
              <p className="truncate text-xs text-fg-muted">{attraction.place}</p>
            </div>
            <button
              type="button"
              className={`${buttonStyles.secondary} ${buttonStyles.small} shrink-0`}
              onClick={() => onAdd(attraction)}
            >
              <PlusIcon className="size-4" />
              <span>
                Add <span className="sr-only">{attraction.name}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
