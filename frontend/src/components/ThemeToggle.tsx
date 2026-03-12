import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { useDarkMode } from '../hooks/useDarkMode';

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useDarkMode();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-yellow-400 transition-all hover:scale-110"
            aria-label="Toggle Dark Mode"
        >
            <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
        </button>
    );
};