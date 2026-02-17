import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.js';
import { API_BASE_URL } from './constants';

export function useApi() {
    const { token, logout } = useContext(AuthContext);

    async function request(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        });

        if (res.status === 401) {
            logout();
            throw new Error('Unauthorized');
        }

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || data.message || 'API Error');
        }

        return data;
    }

    return { request };
}

async function authenticatedFetch(url, method, token, body = null) {
    if (!token) {
        throw new Error('토큰이 필요합니다');
    }

    const headers = { 'Authorization': `Bearer ${token}` };
    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to ${method.toLowerCase()} post: ${response.status} ${response.statusText} - ${errorData.error || ''}`);
    }

    return response.json();
}

export const POST_API = {
    getPublicPosts: async (page = 1, pageSize = 10) => {
        const response = await fetch(
            `${API_BASE_URL}/api/v1/posts?page=${page}&page_size=${pageSize}`
        );
        if (!response.ok) {
            throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
        }
        return response.json();
    },

    getPost: async (postId) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch post: ${response.status} ${response.statusText}`);
        }
        return response.json();
    },

    getUserPosts: async (userId, page = 1, pageSize = 10) => {
        const response = await fetch(
            `${API_BASE_URL}/api/v1/users/${userId}/posts?page=${page}&page_size=${pageSize}`
        );
        if (!response.ok) {
            throw new Error(`Failed to fetch user posts: ${response.status} ${response.statusText}`);
        }
        return response.json();
    },

    createPost: async (title, content, isPublic = true, token) => {
        return authenticatedFetch(
            `${API_BASE_URL}/api/v1/posts`,
            'POST',
            token,
            { title, content, is_public: isPublic }
        );
    },

    updatePost: async (postId, title, content, isPublic = true, token) => {
        return authenticatedFetch(
            `${API_BASE_URL}/api/v1/posts/${postId}`,
            'PUT',
            token,
            { title, content, is_public: isPublic }
        );
    },

    deletePost: async (postId, token) => {
        return authenticatedFetch(
            `${API_BASE_URL}/api/v1/posts/${postId}`,
            'DELETE',
            token
        );
    },
};
