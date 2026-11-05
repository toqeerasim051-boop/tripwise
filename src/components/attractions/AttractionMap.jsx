import { divIcon } from 'leaflet';
import { AttributionControl, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './attractionMap.css';
import Photo from '../common/Photo.jsx';
import { PlusIcon } from '../common/Icons.jsx';
import { buttonStyles } from '../common/buttonStyles.js';

// OpenStreetMap's tiles are free; the attribution is required by their licence.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// A red teardrop location pin, inline SVG (no marker image files to bundle). The tip is the spot.
const PIN = divIcon({
  className: 'attraction-pin',
  html: `<svg viewBox="0 0 24 34" aria-hidden="true" focusable="false">
    <path class="fill-map-pin stroke-map-pin-shade" stroke-width="1" d="M12 .5C5.7.5.5 5.6.5 11.9c0 8.6 11.5 21.4 11.5 21.4s11.5-12.8 11.5-21.4C23.5 5.6 18.3.5 12 .5z"/>
    <circle class="fill-map-pin-dot" cx="12" cy="12" r="4.5"/>
  </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -36],
});

/**
 * Map of a country's top attractions (Leaflet + OpenStreetMap). Each pin opens a popup with the
 * photo, name and an "Add to trip" button (`onAdd(attraction)`). Loaded lazily by
 * AttractionMapLoader, so Leaflet is its own chunk. The attraction cards stay the accessible list.
 */
export default function AttractionMap({ attractions, onAdd }) {
  const bounds = attractions.map(({ lat, lon }) => [lat, lon]);

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [40, 40], maxZoom: 12 }}
      scrollWheelZoom={false}
      attributionControl={false}
      className="h-full w-full"
    >
      <AttributionControl prefix={false} />
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {attractions.map((attraction) => (
        <Marker
          key={attraction.id}
          position={[attraction.lat, attraction.lon]}
          icon={PIN}
          title={attraction.name}
          eventHandlers={{
            // Leaflet makes the pin focusable; name it for screen readers too.
            add: (event) => {
              const pin = event.target.getElement();
              pin?.setAttribute('role', 'button');
              pin?.setAttribute('aria-label', `${attraction.name}, ${attraction.place}`);
            },
          }}
        >
          <Popup minWidth={200} maxWidth={240}>
            <div className="grid gap-2">
              {attraction.image && (
                <div className="overflow-hidden rounded-lg">
                  <Photo
                    src={attraction.image.src}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                </div>
              )}
              <div>
                <p className="font-display text-base font-bold text-fg">{attraction.name}</p>
                <p className="text-xs text-fg-muted">{attraction.place}</p>
              </div>
              <button
                type="button"
                onClick={() => onAdd(attraction)}
                className={`${buttonStyles.primary} ${buttonStyles.small} justify-center`}
              >
                <PlusIcon className="size-3.5" />
                <span>
                  Add <span className="sr-only">{attraction.name}</span> to trip
                </span>
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
