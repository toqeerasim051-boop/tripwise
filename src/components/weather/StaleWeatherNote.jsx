import { InfoIcon } from '../common/Icons.jsx';
import { formatTimeAgo } from '../../utils/formatters.js';

/** Shown when the forecast is an older saved copy because the weather service couldn't be reached. */
export default function StaleWeatherNote({ since }) {
  return (
    <p className="flex items-start gap-1.5 text-sm text-fg-muted">
      <InfoIcon className="mt-0.5 size-4 shrink-0" />
      <span>You seem to be offline. Showing the weather saved {formatTimeAgo(since)}.</span>
    </p>
  );
}
