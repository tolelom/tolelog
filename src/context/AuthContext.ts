import { createContext } from 'react';

export interface LoginParams {
    token: string;
    refreshToken: string;
    username: string;
    userId: number;
    avatarUrl: string | null;
}

export interface AuthContextType {
    token: string | null;
    refreshToken: string | null;
    username: string | null;
    userId: number | null;
    avatarUrl: string | null;
    login: (params: LoginParams) => void;
    logout: () => void;
    setAvatarUrl: (url: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
    token: null,
    refreshToken: null,
    username: null,
    userId: null,
    avatarUrl: null,
    login: () => {},
    logout: () => {},
    setAvatarUrl: () => {},
});
