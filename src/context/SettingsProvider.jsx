import { useEffect, useMemo } from 'react';
import { SettingsContext } from './SettingsContext.js';
import { usePersistentReducer } from '../hooks/usePersistentReducer.js';
import { STORAGE_KEYS } from '../utils/storage.js';
import { applyTheme, sanitizeSettings, settingsReducer } from '../utils/settings.js';

const PERSISTENCE = {
  sanitize: sanitizeSettings,
  replaceAction: (settings) => ({ type: 'replace', settings }),
};

export default function SettingsProvider({ children }) {
  const [settings, dispatch] = usePersistentReducer(
    STORAGE_KEYS.settings,
    settingsReducer,
    PERSISTENCE,
  );

  useEffect(() => applyTheme(settings.theme), [settings.theme]);

  const value = useMemo(
    () => ({ ...settings, setTheme: (theme) => dispatch({ type: 'setTheme', theme }) }),
    [settings, dispatch],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
