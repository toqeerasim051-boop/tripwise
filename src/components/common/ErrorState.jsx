import { getErrorMessage } from '../../services/http.js';
import { buttonStyles } from './buttonStyles.js';
import { AlertIcon } from './Icons.jsx';

/** Inline error with a user-friendly message and a Retry button. Never a blank screen. */
export default function ErrorState({
  title = "Couldn't load this",
  error,
  onRetry,
  compact = false,
}) {
  return (
    <div
      role="alert"
      className={`rounded-xl border border-danger/40 bg-surface text-center ${compact ? 'px-4 py-6' : 'px-6 py-10'}`}
    >
      <AlertIcon className="mx-auto size-8 text-danger" />
      <h2 className="mt-2 text-lg font-semibold text-fg">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-fg-muted">{getErrorMessage(error)}</p>
      {onRetry && (
        <button type="button" className={`${buttonStyles.secondary} mt-4`} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
