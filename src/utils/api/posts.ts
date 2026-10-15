import { request } from './client';
import type { SuccessResponse, Post, PostListWithPagination } from '../../types';

function pageParams(page: number, pageSize: number, tag?: string): URLSearchParams {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (tag) params.append('tag', tag);
    return params;
}

export const POST_API = {
    getPublicPosts: async (
        page: number = 1,
        pageSize: number = 10,
        { signal, tag }: { signal?: AbortSignal; tag?: string } = {}
    ): Promise<SuccessResponse<PostListWithPagination>> => {
        return request(`/api/v1/posts?${pageParams(page, pageSize, tag)}`, { signal, errorMessage: '글 목록을 불러오지 못했습니다' });
    },

    getPost: async (
        postId: number | string,
        { signal, token }: { signal?: AbortSignal; token?: string } = {}
    ): Promise<SuccessResponse<Post>> => {
        return request(`/api/v1/posts/${postId}`, { auth: 'optional', token, signal, errorMessage: '글을 불러오지 못했습니다' });
    },

    getUserPosts: async (
        userId: number | string,
        page: number = 1,
        pageSize: number = 10,
        { signal, tag, token }: { signal?: AbortSignal; tag?: string; token?: string } = {}
    ): Promise<SuccessResponse<PostListWithPagination>> => {
        return request(`/api/v1/users/${userId}/posts?${pageParams(page, pageSize, tag)}`, {
            auth: 'optional', token, signal, errorMessage: '사용자 글 목록을 불러오지 못했습니다',
        });
    },

    searchPosts: async (
        query: string,
        page: number = 1,
        pageSize: number = 10,
        { signal }: { signal?: AbortSignal } = {}
    ): Promise<SuccessResponse<PostListWithPagination>> => {
        const params = new URLSearchParams({ q: query, page: String(page), page_size: String(pageSize) });
        return request(`/api/v1/posts/search?${params}`, { signal, errorMessage: '검색에 실패했습니다' });
    },

    createPost: async (title: string, content: string, isPublic: boolean = true, token: string, tags: string = ''): Promise<SuccessResponse<{ id: number }>> => {
        return request('/api/v1/posts', { method: 'POST', auth: 'required', token, json: { title, content, is_public: isPublic, tags } });
    },

    // 편집기의 저장은 곧 발행이므로 draft 를 열어 저장해도 published 가 된다
    updatePost: async (postId: number | string, title: string, content: string, isPublic: boolean = true, token: string, tags: string = ''): Promise<SuccessResponse<{ id: number }>> => {
        return request(`/api/v1/posts/${postId}`, {
            method: 'PUT', auth: 'required', token, json: { title, content, is_public: isPublic, tags, status: 'published' },
        });
    },

    deletePost: async (postId: number | string, token: string): Promise<SuccessResponse<null>> => {
        return request(`/api/v1/posts/${postId}`, { method: 'DELETE', auth: 'required', token });
    },

    getDrafts: async (token: string): Promise<SuccessResponse<Post[]>> => {
        return request('/api/v1/drafts', { auth: 'required', token });
    },

    createDraft: async (title: string, content: string, tags: string, token: string): Promise<SuccessResponse<{ id: number }>> => {
        return request('/api/v1/posts', {
            method: 'POST', auth: 'required', token, json: { title, content, is_public: false, tags, status: 'draft' },
        });
    },

    saveDraft: async (postId: number | string, title: string, content: string, tags: string, token: string): Promise<SuccessResponse<{ id: number }>> => {
        return request(`/api/v1/posts/${postId}`, { method: 'PUT', auth: 'required', token, json: { title, content, tags, status: 'draft' } });
    },
};
