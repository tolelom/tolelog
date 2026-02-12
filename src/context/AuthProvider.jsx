import { useEffect, useState } from 'react';
import { AuthContext } from './AuthContext.js';
import { STORAGE_KEYS } from '../utils/constants';

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.TOKEN));
    const [username, setUsername] = useState(() => {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr).username : null;
    });
    const [userId, setUserId] = useState(() => {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr).user_id : null;
    });

    useEffect(() => {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        } else {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
    }, [token]);

    useEffect(() => {
        if (username && userId) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ username, user_id: userId }));
        } else {
            localStorage.removeItem(STORAGE_KEYS.USER);
        }
    }, [username, userId]);

    const login = ({ token: newToken, username: newUsername, userId: newUserId }) => {
        setToken(newToken);
        setUsername(newUsername);
        setUserId(newUserId);
    };

    const logout = () => {
        setToken(null);
        setUsername(null);
        setUserId(null);
    };

    return (
        <AuthContext.Provider value={{ token, username, userId, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
