import { useTheme } from '../context/ThemeContext';
import { IconButton } from './ui';
import { MoonIcon, SunIcon } from './icons';

/** Header control that flips between light and dark themes. */
export function ThemeToggle(): JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <IconButton
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </IconButton>
  );
}
