import {useContext} from 'react';
import {AuthContext} from "../context/AuthContext.js"

export function useApi() {
    const {token, logout} = useContext(AuthContext);

    async function request(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`/api${path}`, {
            ...options,
            headers,
        })

        if (res.status === 401) {
            logout();
            throw new Error('Unauthorized');
        }

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || 'API Error');
        }

        return data;
    }

    return {request};
}

