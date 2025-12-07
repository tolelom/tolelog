import {useContext} from 'react';
import {AuthContext} from "../context/AuthContext.js"

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

        const res = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        })

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

    return {request};
}

export const POST_API = {
    // 공개 글 목록
    getPublicPosts: async (page = 1, pageSize = 10) => {
        const response = await fetch(
            `${API_BASE_URL}/posts?page=${page}&page_size=${pageSize}`
        );
        return response.json();
    },

    // 글 상세 조회
    getPost: async (postId) => {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
        return response.json();
    },

    // 사용자 글 목록
    getUserPosts: async (userId, page = 1, pageSize = 10) => {
        const response = await fetch(
            `${API_BASE_URL}/users/${userId}/posts?page=${page}&page_size=${pageSize}`
        );
        return response.json();
    },

    // 글 생성
    createPost: async (title, content, isPublic = true, token) => {
        const response = await fetch(`${API_BASE_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                title,
                content,
                is_public: isPublic,
            }),
        });
        return response.json();
    },

    // 글 수정
    updatePost: async (postId, title, content, isPublic = true, token) => {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                title,
                content,
                is_public: isPublic,
            }),
        });
        return response.json();
    },

    // 글 삭제
    deletePost: async (postId, token) => {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    },
};
