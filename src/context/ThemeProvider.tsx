import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';
import { STORAGE_KEYS } from '../utils/constants';

const isBrowser = typeof window !== 'undefined';

// SSG 단계에서는 'light'로 통일 렌더링. 클라이언트 마운트 후 localStorage / prefers-color-scheme 으로 보정.
// FOUC 가 신경 쓰일 정도면 index.html 에 인라인 스크립트로 data-theme 을 미리 세팅하는 패턴을 추가.
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
    const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

    // 마운트 직후 SSR 기본값('light')과 실제 사용자 선호도가 다르면 보정.
    useEffect(() => {
        const actual = resolveInitialTheme();
        if (actual !== theme) setTheme(actual);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isBrowser) return;
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem(STORAGE_KEYS.THEME, theme); } catch { /* ignore */ }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
