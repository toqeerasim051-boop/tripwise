import Photo from '../common/Photo.jsx';
import { CameraIcon, MapPinIcon, PlusIcon } from '../common/Icons.jsx';
import { buttonStyles } from '../common/buttonStyles.js';

function NoPhoto() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 bg-surface-muted text-fg-muted">
      <CameraIcon className="size-8" />
      <span className="text-xs">No photo available</span>
    </div>
  );
}

/**
 * A curated attraction: photo, place, short description and, when `onAdd` is given, an
 * "Add to trip" action. The photo is decorative (alt="") because the
 * heading names the attraction.
 */
export default function AttractionCard({ attraction, onAdd, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  const { name, place, description, image } = attraction;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="aspect-4/3 overflow-hidden">
        <Photo
          src={image?.src}
          alt=""
          className="size-full bg-surface-muted"
          fallback={<NoPhoto />}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Heading className="text-base leading-snug font-semibold text-fg">{name}</Heading>
        <p className="flex items-center gap-1 text-sm text-fg-muted">
          <MapPinIcon className="size-4 shrink-0" />
          {place}
        </p>
        {description && <p className="line-clamp-4 text-sm text-fg">{description}</p>}
        {onAdd && (
          <div className="mt-auto pt-2">
            <button
              type="button"
              className={`${buttonStyles.primary} ${buttonStyles.small}`}
              onClick={() => onAdd(attraction)}
            >
              <PlusIcon className="size-4" />
              <span>
                Add <span className="sr-only">{name}</span> to trip
              </span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
