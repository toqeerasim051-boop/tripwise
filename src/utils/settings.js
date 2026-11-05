/** Pure settings logic. Settings are { theme: 'system' | 'light' | 'dark' }. */

export const THEMES = ['system', 'light', 'dark'];

export const DEFAULT_SETTINGS = { theme: 'system' };

/** Builds valid settings from untrusted (stored) data, falling back to defaults per field. */
export function sanitizeSettings(data) {
  const theme = THEMES.includes(data?.theme) ? data.theme : DEFAULT_SETTINGS.theme;
  return { theme };
}

/** Actions: { type: 'setTheme', theme } | { type: 'replace', settings } (e.g. from another tab). */
export function settingsReducer(state, action) {
  switch (action.type) {
    case 'setTheme':
      if (!THEMES.includes(action.theme) || action.theme === state.theme) return state;
      return { ...state, theme: action.theme };
    case 'replace':
      return action.settings;
    default:
      throw new Error(`Unknown settings action: ${action.type}`);
  }
}

/**
 * Sets `data-theme` on <html> for a manual choice; 'system' removes it so prefers-color-scheme
 * applies. index.html runs the same logic before first paint to avoid a flash of the wrong theme.
 */
export function applyTheme(theme, root = document.documentElement) {
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
}
