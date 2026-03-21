import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext, type LoginParams } from './AuthContext';
import { AUTH_API } from '../utils/api';
import { STORAGE_KEYS } from '../utils/constants';

function safeParseUser(key: string): string | number | null {
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
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.TOKEN));
    const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN));
    const [username, setUsername] = useState<string | null>(() => safeParseUser('username') as string | null);
    const [userId, setUserId] = useState<number | null>(() => safeParseUser('user_id') as number | null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(() => safeParseUser('avatar_url') as string | null);

    useEffect(() => {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        } else {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
    }, [token]);

    useEffect(() => {
        if (refreshToken) {
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        } else {
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        }
    }, [refreshToken]);

    useEffect(() => {
        if (username && userId) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ username, user_id: userId, avatar_url: avatarUrl || '' }));
        } else {
            localStorage.removeItem(STORAGE_KEYS.USER);
        }
    }, [username, userId, avatarUrl]);

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
            AUTH_API.logout(currentToken).catch(() => {});
        }
        setToken(null);
        setRefreshToken(null);
        setUsername(null);
        setUserId(null);
        setAvatarUrl(null);
    };

    return (
        <AuthContext.Provider value={{ token, refreshToken, username, userId, avatarUrl, login, logout, setAvatarUrl }}>
            {children}
        </AuthContext.Provider>
    );
}
