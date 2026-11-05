import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

/**
 * Page title band (soft teal gradient, serif title, optional `eyebrow` above it). The <h1> is
 * focus-targetable for route-change focus management, and a string title also becomes the browser
 * tab title.
 */
export default function PageHeader({ eyebrow, title, description, actions }) {
  useDocumentTitle(typeof title === 'string' ? title : null);

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-line bg-linear-to-br from-primary-soft via-surface to-surface px-5 py-7 shadow-card sm:px-8 sm:py-9">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {eyebrow}
            </p>
          )}
          <h1
            tabIndex={-1}
            className="text-3xl font-bold tracking-tight wrap-break-word text-fg sm:text-4xl"
          >
            {title}
          </h1>
          {description && <p className="mt-2 max-w-prose text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
