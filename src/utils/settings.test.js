// @vitest-environment node
import { applyTheme, sanitizeSettings, settingsReducer } from './settings.js';

describe('sanitizeSettings', () => {
  it('keeps a valid theme and falls back to system otherwise', () => {
    expect(sanitizeSettings({ theme: 'dark', extra: 1 })).toEqual({ theme: 'dark' });
    expect(sanitizeSettings({ theme: 'purple' })).toEqual({ theme: 'system' });
    expect(sanitizeSettings([])).toEqual({ theme: 'system' });
    expect(sanitizeSettings(null)).toEqual({ theme: 'system' });
  });
});

describe('settingsReducer', () => {
  const state = { theme: 'system' };

  it('sets a valid theme', () => {
    expect(settingsReducer(state, { type: 'setTheme', theme: 'light' })).toEqual({
      theme: 'light',
    });
  });

  it('returns the same state for an unchanged or invalid theme', () => {
    expect(settingsReducer(state, { type: 'setTheme', theme: 'system' })).toBe(state);
    expect(settingsReducer(state, { type: 'setTheme', theme: 'neon' })).toBe(state);
  });

  it('replaces settings and rejects unknown actions', () => {
    const next = { theme: 'dark' };
    expect(settingsReducer(state, { type: 'replace', settings: next })).toBe(next);
    expect(() => settingsReducer(state, { type: 'nope' })).toThrow('Unknown settings action');
  });
});

describe('applyTheme', () => {
  it('sets data-theme for manual themes and removes it for system', () => {
    const root = { dataset: {} };
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    applyTheme('light', root);
    expect(root.dataset.theme).toBe('light');
    applyTheme('system', root);
    expect(root.dataset).not.toHaveProperty('theme');
  });
});
