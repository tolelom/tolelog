import { createContext } from 'react';

export const AuthContext = createContext({
    token: null,
    username: null,
    userId: null,
    login: () => {},
    logout: () => {},
});
