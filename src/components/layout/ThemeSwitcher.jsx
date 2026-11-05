import { MoonIcon, SunIcon } from '../common/Icons.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useSettings } from '../../hooks/useSettings.js';

const iconStyles =
  'absolute size-5 transition-[opacity,rotate,scale] duration-500 ease-out motion-reduce:transition-opacity';

/**
 * One round light/dark toggle. Until the user clicks, the theme follows the device ('system');
 * a click stores the opposite of what is shown now.
 */
export default function ThemeSwitcher() {
  const { theme, setTheme } = useSettings();
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
      className="relative grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface-muted text-fg shadow-card transition-colors hover:border-primary hover:text-primary"
    >
      <SunIcon
        className={`${iconStyles} ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`}
      />
      <MoonIcon
        className={`${iconStyles} ${isDark ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}
      />
    </button>
  );
}
