import { ExternalLinkIcon } from './Icons.jsx';
import { buttonStyles } from './buttonStyles.js';

const VARIANTS = {
  link: 'inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline',
  button: buttonStyles.primary,
  secondaryButton: buttonStyles.secondary,
};

/**
 * Link to a site outside TripWise. Always opens in a new tab with
 * rel="noopener noreferrer" and tells assistive tech that it does.
 * Callers must validate user-entered URLs with isSafeUrl before rendering.
 */
export default function ExternalLink({ href, children, variant = 'link', className = '' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${VARIANTS[variant]} ${className}`}
    >
      {children}
      <ExternalLinkIcon className="size-3.5 shrink-0" />
      {/* The space keeps the accessible name "Label (opens external site)", not "Label(opens…". */}{' '}
      <span className="sr-only">(opens external site)</span>
    </a>
  );
}
