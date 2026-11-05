/** Shared class strings so <Link> and <button> elements look identical. */
const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

export const buttonStyles = {
  primary: `${base} bg-primary text-on-primary hover:bg-primary-hover`,
  secondary: `${base} border border-line bg-surface text-fg hover:bg-surface-muted`,
  danger: `${base} bg-danger text-on-danger hover:opacity-90`,
  /** Text-only destructive action, e.g. "Delete" on a card. */
  dangerGhost: `${base} border border-line bg-surface text-danger hover:bg-surface-muted`,
  small: 'px-3 py-1.5',
};
