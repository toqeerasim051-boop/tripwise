import { TemperatureIcon } from '../common/Icons.jsx';

const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function Sun({ cx = 32, cy = 32, r = 13 }) {
  return (
    <g>
      <g className="stroke-weather-sun" strokeWidth="3.5" strokeLinecap="round">
        {RAY_ANGLES.map((angle) => {
          const x = Math.cos((angle * Math.PI) / 180);
          const y = Math.sin((angle * Math.PI) / 180);
          return (
            <line
              key={angle}
              x1={cx + x * (r + 4)}
              y1={cy + y * (r + 4)}
              x2={cx + x * (r + 9)}
              y2={cy + y * (r + 9)}
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={r} className="fill-weather-sun" />
    </g>
  );
}

/** A cloud made of three circles on a flat base (x 12–57, y 16–48 before `transform`). */
function Cloud({ transform, dark = false }) {
  return (
    <g transform={transform} className={dark ? 'fill-weather-cloud-dark' : 'fill-weather-cloud'}>
      <circle cx="22" cy="38" r="10" />
      <circle cx="34" cy="29" r="13" />
      <circle cx="46" cy="37" r="11" />
      <rect x="22" y="36" width="24" height="12" />
    </g>
  );
}

function Streaks({ from, to, className = 'stroke-weather-rain' }) {
  return (
    <g className={className} strokeWidth="3.5" strokeLinecap="round">
      {[22, 32, 42].map((x) => (
        <line key={x} x1={x} y1={from} x2={x - 3} y2={to} />
      ))}
    </g>
  );
}

const SCENES = {
  clear: () => <Sun />,
  'partly-cloudy': () => (
    <>
      <Sun cx={24} cy={22} r={9} />
      <Cloud transform="translate(4 8)" />
    </>
  ),
  cloudy: () => (
    <>
      <Cloud dark transform="translate(14 -6) scale(0.8)" />
      <Cloud transform="translate(-4 6)" />
    </>
  ),
  fog: () => (
    <>
      <Cloud transform="translate(0 -10)" />
      <g className="stroke-weather-fog" strokeWidth="4" strokeLinecap="round">
        <line x1="14" y1="47" x2="48" y2="47" />
        <line x1="20" y1="56" x2="54" y2="56" />
      </g>
    </>
  ),
  drizzle: () => (
    <>
      <Cloud transform="translate(0 -8)" />
      <Streaks from={47} to={53} />
    </>
  ),
  rain: () => (
    <>
      <Cloud dark transform="translate(0 -8)" />
      <Streaks from={45} to={58} />
    </>
  ),
  'freezing-rain': () => (
    <>
      <Cloud dark transform="translate(0 -8)" />
      <g className="stroke-weather-rain" strokeWidth="3.5" strokeLinecap="round">
        <line x1="22" y1="45" x2="19" y2="56" />
        <line x1="42" y1="45" x2="39" y2="56" />
      </g>
      <circle cx="31" cy="53" r="3.5" className="fill-weather-snow" />
    </>
  ),
  snow: () => (
    <>
      <Cloud transform="translate(0 -8)" />
      <g className="fill-weather-snow">
        <circle cx="22" cy="49" r="3.5" />
        <circle cx="42" cy="49" r="3.5" />
        <circle cx="32" cy="57" r="3.5" />
      </g>
    </>
  ),
  thunderstorm: () => (
    <>
      <Cloud dark transform="translate(0 -8)" />
      <path d="M35 38 26 52h7l-4 11 13-16h-7l4-9z" className="fill-weather-sun" />
    </>
  ),
};

/**
 * Colourful weather illustration (decorative: the visible label carries the meaning).
 * `name` is getWeatherInfo(code).icon; unknown names show a thermometer.
 */
export default function WeatherIcon({ name, className = 'size-5' }) {
  const Scene = SCENES[name];
  if (!Scene) return <TemperatureIcon className={`text-fg-muted ${className}`} />;
  return (
    <svg
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <Scene />
    </svg>
  );
}
