import { labelStyles } from './formStyles.js';

/**
 * Label + control + hint + error. `children` is a render function that receives the props the
 * control needs ({ id, 'aria-invalid', 'aria-describedby', required }) so it stays a real
 * <input>/<select> with correct labelling.
 */
export default function FormField({ id, label, hint, error, required = false, children }) {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className={labelStyles}>
        {label}
        {!required && <span className="font-normal text-fg-muted"> (optional)</span>}
      </label>
      {children({
        id,
        required,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
