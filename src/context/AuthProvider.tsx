import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext, type LoginParams } from './AuthContext';
import { AUTH_API } from '../utils/api';
import { STORAGE_KEYS } from '../utils/constants';

// SSG/SSR 빌드 단계에서는 window/localStorage 가 없으므로 안전 가드.
const isBrowser = typeof window !== 'undefined';

function readLocalStorage(key: string): string | null {
    if (!isBrowser) return null;
    try { return localStorage.getItem(key); } catch { return null; }
}

function safeParseUser(key: string): string | number | null {
    if (!isBrowser) return null;
    try {
        const str = localStorage.getItem(STORAGE_KEYS.USER);
        if (!str) return null;
        const parsed = JSON.parse(str);
        return parsed?.[key] ?? null;
    } catch {
        localStorage.removeItem(STORAGE_KEYS.USER);
        return null;
    }
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    // SSG 와 하이드레이션 첫 렌더는 비로그인으로 같게 두고, 마운트 뒤 localStorage 에서 읽는다.
    // 읽기 전(ready=false)에는 저장 effect 가 localStorage 를 지우지 않고, 로그인이 필요한 화면은 판단을 미룬다.
    const [token, setToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setToken(readLocalStorage(STORAGE_KEYS.TOKEN));
        setRefreshToken(readLocalStorage(STORAGE_KEYS.REFRESH_TOKEN));
        setUsername(safeParseUser('username') as string | null);
        setUserId(safeParseUser('user_id') as number | null);
        setAvatarUrl(safeParseUser('avatar_url') as string | null);
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready) return;
        if (token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        } else {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
    }, [token, ready]);

    useEffect(() => {
        if (!ready) return;
        if (refreshToken) {
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        } else {
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        }
    }, [refreshToken, ready]);

    useEffect(() => {
        if (!ready) return;
        if (username && userId) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ username, user_id: userId, avatar_url: avatarUrl || '' }));
        } else {
            localStorage.removeItem(STORAGE_KEYS.USER);
        }
    }, [username, userId, avatarUrl, ready]);

    // 다른 탭에서 로그아웃/로그인 시 동기화
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEYS.TOKEN) {
                if (!e.newValue) {
                    setToken(null);
                    setRefreshToken(null);
                    setUsername(null);
                    setUserId(null);
                    setAvatarUrl(null);
                } else {
                    setToken(e.newValue);
                    setRefreshToken(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN));
                    const user = safeParseUser('username') as string | null;
                    const uid = safeParseUser('user_id') as number | null;
                    const avatar = safeParseUser('avatar_url') as string | null;
                    setUsername(user);
                    setUserId(uid);
                    setAvatarUrl(avatar);
                }
            }
            if (e.key === STORAGE_KEYS.REFRESH_TOKEN) {
                setRefreshToken(e.newValue ?? null);
            }
            if (e.key === STORAGE_KEYS.USER) {
                if (!e.newValue) {
                    setUsername(null);
                    setUserId(null);
                    setAvatarUrl(null);
                } else {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        setUsername(parsed?.username ?? null);
                        setUserId(parsed?.user_id ?? null);
                        setAvatarUrl(parsed?.avatar_url ?? null);
                    } catch { /* ignore */ }
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const login = ({ token: newToken, refreshToken: newRefreshToken, username: newUsername, userId: newUserId, avatarUrl: newAvatarUrl }: LoginParams) => {
        setToken(newToken);
        setRefreshToken(newRefreshToken);
        setUsername(newUsername);
        setUserId(newUserId);
        setAvatarUrl(newAvatarUrl || null);
    };

    const logout = () => {
        const currentToken = token;
        if (currentToken) {
            AUTH_API.logout(currentToken).catch((err) => console.warn('auth: logout request failed:', err));
        }
        setToken(null);
        setRefreshToken(null);
        setUsername(null);
        setUserId(null);
        setAvatarUrl(null);
    };

    return (
        <AuthContext.Provider value={{ token, refreshToken, username, userId, avatarUrl, ready, login, logout, setAvatarUrl }}>
            {children}
        </AuthContext.Provider>
    );
}
