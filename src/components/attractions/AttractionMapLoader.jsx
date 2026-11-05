import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import Skeleton from '../common/Skeleton.jsx';

const AttractionMap = lazy(() => import('./AttractionMap.jsx'));

const canObserve = () => typeof IntersectionObserver !== 'undefined';

// A few curated attractions have no coordinates on Wikipedia; they stay in the list but get no pin.
const hasCoordinates = ({ lat, lon }) => Number.isFinite(lat) && Number.isFinite(lon);

/**
 * Space for the attractions map. Leaflet (and its map tiles) load only once this box comes near
 * the screen; without IntersectionObserver the map loads at once. Renders nothing when no
 * attraction has coordinates.
 */
export default function AttractionMapLoader({ attractions, countryName, onAdd }) {
  const pinned = attractions.filter(hasCoordinates);
  const hasPins = pinned.length > 0; // the box (and so the ref) exists only when there are pins
  const ref = useRef(null);
  const [near, setNear] = useState(() => !canObserve());

  useEffect(() => {
    const element = ref.current;
    if (near || !element) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setNear(true);
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near, hasPins]);

  if (!hasPins) return null;
  const placeholder = <Skeleton className="h-full w-full" />;

  return (
    <figure className="mt-6">
      {/* `isolate` keeps Leaflet's z-indexed panes below the sticky header. */}
      <div
        ref={ref}
        className="isolate h-72 overflow-hidden rounded-2xl border border-line shadow-card sm:h-96"
      >
        {near ? (
          <Suspense fallback={placeholder}>
            <AttractionMap attractions={pinned} onAdd={onAdd} />
          </Suspense>
        ) : (
          placeholder
        )}
      </div>
      <figcaption className="mt-2 text-sm text-fg-muted">
        Where the top attractions in {countryName} are. Select a pin for details.
      </figcaption>
    </figure>
  );
}
