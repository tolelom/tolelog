import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? '다크 모드' : '라이트 모드'}
            aria-label="테마 전환"
        >
            {theme === 'light' ? '\u263E' : '\u2600'}
        </button>
    );
}
