import { API_BASE_URL } from '../constants';
import { authenticatedFetch } from './client';
import type { SuccessResponse, Post, PostListWithPagination } from '../../types';

export const POST_API = {
    getPublicPosts: async (
        page: number = 1,
        pageSize: number = 10,
        { signal, tag }: { signal?: AbortSignal; tag?: string } = {}
    ): Promise<SuccessResponse<PostListWithPagination>> => {
        const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
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

    getPost: async (
        postId: number | string,
        { signal, token }: { signal?: AbortSignal; token?: string } = {}
    ): Promise<SuccessResponse<Post>> => {
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}`, { signal, headers });
        if (!response.ok) {
            throw new Error(`글을 불러오지 못했습니다 (${response.status})`);
        }
        return response.json();
    },

    getUserPosts: async (
        userId: number | string,
        page: number = 1,
        pageSize: number = 10,
        { signal, tag, token }: { signal?: AbortSignal; tag?: string; token?: string } = {}
    ): Promise<SuccessResponse<PostListWithPagination>> => {
        const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
        if (tag) params.append('tag', tag);
        const headers: Record<string, string> = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(
            `${API_BASE_URL}/api/v1/users/${userId}/posts?${params}`,
            { signal, headers }
        );
        if (!response.ok) {
            throw new Error(`사용자 글 목록을 불러오지 못했습니다 (${response.status})`);
        }
        return response.json();
    },

    searchPosts: async (
        query: string,
        page: number = 1,
        pageSize: number = 10,
        { signal }: { signal?: AbortSignal } = {}
    ): Promise<SuccessResponse<PostListWithPagination>> => {
        const params = new URLSearchParams({ q: query, page: String(page), page_size: String(pageSize) });
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/search?${params}`, { signal });
        if (!response.ok) throw new Error(`검색에 실패했습니다 (${response.status})`);
        return response.json();
    },

    createPost: async (title: string, content: string, isPublic: boolean = true, token: string, tags: string = ''): Promise<SuccessResponse<{ id: number }>> => {
        return authenticatedFetch<SuccessResponse<{ id: number }>>(
            `${API_BASE_URL}/api/v1/posts`,
            'POST',
            token,
            { title, content, is_public: isPublic, tags }
        );
    },

    updatePost: async (postId: number | string, title: string, content: string, isPublic: boolean = true, token: string, tags: string = ''): Promise<SuccessResponse<{ id: number }>> => {
        return authenticatedFetch<SuccessResponse<{ id: number }>>(
            `${API_BASE_URL}/api/v1/posts/${postId}`,
            'PUT',
            token,
            { title, content, is_public: isPublic, tags }
        );
    },

    deletePost: async (postId: number | string, token: string): Promise<SuccessResponse<null>> => {
        return authenticatedFetch<SuccessResponse<null>>(
            `${API_BASE_URL}/api/v1/posts/${postId}`,
            'DELETE',
            token
        );
    },

    getDrafts: async (token: string): Promise<SuccessResponse<Post[]>> => {
        return authenticatedFetch<SuccessResponse<Post[]>>(
            `${API_BASE_URL}/api/v1/drafts`,
            'GET',
            token
        );
    },

    createDraft: async (title: string, content: string, tags: string, token: string): Promise<SuccessResponse<{ id: number }>> => {
        return authenticatedFetch<SuccessResponse<{ id: number }>>(
            `${API_BASE_URL}/api/v1/posts`,
            'POST',
            token,
            { title, content, is_public: false, tags, status: 'draft' }
        );
    },

    saveDraft: async (postId: number | string, title: string, content: string, tags: string, token: string): Promise<SuccessResponse<{ id: number }>> => {
        return authenticatedFetch<SuccessResponse<{ id: number }>>(
            `${API_BASE_URL}/api/v1/posts/${postId}`,
            'PUT',
            token,
            { title, content, tags, status: 'draft' }
        );
    },
};
