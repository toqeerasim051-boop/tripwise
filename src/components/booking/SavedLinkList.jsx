import ExternalLink from '../common/ExternalLink.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { displayHost, isSafeUrl } from '../../utils/bookingLinks.js';
import { linkTypeLabel } from '../../utils/savedLinks.js';

/** Saved links with type, host and actions. `data-link-id` / `data-control` support focus restore. */
export default function SavedLinkList({ links, onEdit, onDelete }) {
  return (
    <ul role="list" className="divide-y divide-line rounded-xl border border-line bg-surface">
      {links.map((link) => (
        <li
          key={link.id}
          data-link-id={link.id}
          className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
        >
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-muted">
                {linkTypeLabel(link.type)}
              </span>
              {/* Re-checked at render time, not only when saved. */}
              {isSafeUrl(link.url) ? (
                <ExternalLink href={link.url} className="wrap-break-word">
                  {link.label}
                </ExternalLink>
              ) : (
                <span className="font-medium text-fg">{link.label}</span>
              )}
            </p>
            <p className="mt-0.5 text-sm break-all text-fg-muted">{displayHost(link.url)}</p>
          </div>
          <span className="flex shrink-0 gap-2">
            <button
              type="button"
              data-control="edit"
              className={`${buttonStyles.secondary} ${buttonStyles.small}`}
              onClick={() => onEdit(link)}
            >
              Edit <span className="sr-only">{link.label}</span>
            </button>
            <button
              type="button"
              data-control="delete"
              className={`${buttonStyles.dangerGhost} ${buttonStyles.small}`}
              onClick={() => onDelete(link)}
            >
              Delete <span className="sr-only">{link.label}</span>
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
