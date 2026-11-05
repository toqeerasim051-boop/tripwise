import { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext.js';

/** { theme: 'system' | 'light' | 'dark', setTheme(theme) } */
export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>');
  return value;
}
