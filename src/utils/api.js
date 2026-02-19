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
            throw new Error('인증이 만료되었습니다');
        }

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || data.message || '요청 처리에 실패했습니다');
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
        const message = errorData.error || errorData.message || `요청 실패 (${response.status})`;
        throw new Error(message);
    }

    return response.json();
}

export const IMAGE_API = {
    upload: async (file, token) => {
        if (!token) {
            throw new Error('토큰이 필요합니다');
        }

        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `이미지 업로드 실패: ${response.status}`);
        }

        return response.json();
    },
};

export const AUTH_API = {
    login: async (username, password) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || '로그인에 실패했습니다');
        }
        return data;
    },

    register: async (username, password) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || '회원가입에 실패했습니다');
        }
        return data;
    },
};

export const USER_API = {
    getProfile: async (userId, { signal } = {}) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, { signal });
        if (!response.ok) {
            throw new Error(`사용자 프로필을 불러오지 못했습니다 (${response.status})`);
        }
        return response.json();
    },
};

export const POST_API = {
    getPublicPosts: async (page = 1, pageSize = 10, { signal, tag } = {}) => {
        const params = new URLSearchParams({ page, page_size: pageSize });
        if (tag) params.append('tag', tag);
        const response = await fetch(
            `${API_BASE_URL}/api/v1/posts?${params}`,
            { signal }
        );
        if (!response.ok) {
            throw new Error(`글 목록을 불러오지 못했습니다 (${response.status})`);
        }
        return response.json();
    },

    getPost: async (postId, { signal } = {}) => {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}`, { signal });
        if (!response.ok) {
            throw new Error(`글을 불러오지 못했습니다 (${response.status})`);
        }
        return response.json();
    },

    getUserPosts: async (userId, page = 1, pageSize = 10, { signal, tag } = {}) => {
        const params = new URLSearchParams({ page, page_size: pageSize });
        if (tag) params.append('tag', tag);
        const response = await fetch(
            `${API_BASE_URL}/api/v1/users/${userId}/posts?${params}`,
            { signal }
        );
        if (!response.ok) {
            throw new Error(`사용자 글 목록을 불러오지 못했습니다 (${response.status})`);
        }
        return response.json();
    },

    createPost: async (title, content, isPublic = true, token, tags = '') => {
        return authenticatedFetch(
            `${API_BASE_URL}/api/v1/posts`,
            'POST',
            token,
            { title, content, is_public: isPublic, tags }
        );
    },

    updatePost: async (postId, title, content, isPublic = true, token, tags = '') => {
        return authenticatedFetch(
            `${API_BASE_URL}/api/v1/posts/${postId}`,
            'PUT',
            token,
            { title, content, is_public: isPublic, tags }
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
