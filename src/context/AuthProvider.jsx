import { useEffect, useState } from 'react';
import { AuthContext } from './AuthContext.js';
import { STORAGE_KEYS } from '../utils/constants';

function safeParseUser(key) {
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

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.TOKEN));
    const [username, setUsername] = useState(() => safeParseUser('username'));
    const [userId, setUserId] = useState(() => safeParseUser('user_id'));
    const [avatarUrl, setAvatarUrl] = useState(() => safeParseUser('avatar_url'));

    useEffect(() => {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        } else {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
    }, [token]);

    useEffect(() => {
        if (username && userId) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ username, user_id: userId, avatar_url: avatarUrl || '' }));
        } else {
            localStorage.removeItem(STORAGE_KEYS.USER);
        }
    }, [username, userId, avatarUrl]);

    // 다른 탭에서 로그아웃/로그인 시 동기화
    useEffect(() => {
        const handleStorage = (e) => {
            if (e.key === STORAGE_KEYS.TOKEN) {
                if (!e.newValue) {
                    setToken(null);
                    setUsername(null);
                    setUserId(null);
                    setAvatarUrl(null);
                } else {
                    setToken(e.newValue);
                    const user = safeParseUser('username');
                    const uid = safeParseUser('user_id');
                    const avatar = safeParseUser('avatar_url');
                    setUsername(user);
                    setUserId(uid);
                    setAvatarUrl(avatar);
                }
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

    const login = ({ token: newToken, username: newUsername, userId: newUserId, avatarUrl: newAvatarUrl }) => {
        setToken(newToken);
        setUsername(newUsername);
        setUserId(newUserId);
        setAvatarUrl(newAvatarUrl || null);
    };

    const logout = () => {
        setToken(null);
        setUsername(null);
        setUserId(null);
        setAvatarUrl(null);
    };

    return (
        <AuthContext.Provider value={{ token, username, userId, avatarUrl, login, logout, setAvatarUrl }}>
            {children}
        </AuthContext.Provider>
    );
}
