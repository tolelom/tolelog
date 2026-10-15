import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';
import { STORAGE_KEYS } from '../utils/constants';

const isBrowser = typeof window !== 'undefined';

// SSG 와 하이드레이션 첫 렌더는 'light'로 같게 두고, 마운트 뒤 localStorage / prefers-color-scheme 으로 보정한다.
// 첫 페인트의 색은 index.html 인라인 스크립트가 data-theme 을 미리 세팅해 맞춘다.
function resolveInitialTheme(): Theme {
    if (!isBrowser) return 'light';
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.THEME);
        if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* ignore */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>('light');
    const [resolved, setResolved] = useState(false);

    useEffect(() => {
        setTheme(resolveInitialTheme());
        setResolved(true);
    }, []);

    useEffect(() => {
        if (!isBrowser || !resolved) return;
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem(STORAGE_KEYS.THEME, theme); } catch { /* ignore */ }
    }, [theme, resolved]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
