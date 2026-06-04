import { API_BASE_URL } from '../constants';
import { authenticatedFetch } from './client';
import type { SuccessResponse, TagInfo } from '../../types';

export const IMAGE_API = {
    upload: async (file: File, token: string): Promise<SuccessResponse<{ url: string }>> => {
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

export const LIKE_API = {
    toggle: async (postId: number | string, token: string): Promise<SuccessResponse<{ liked: boolean; like_count: number }>> => {
        return authenticatedFetch<SuccessResponse<{ liked: boolean; like_count: number }>>(`${API_BASE_URL}/api/v1/posts/${postId}/like`, 'POST', token);
    },
    getStatus: async (postId: number | string, { signal, token }: { signal?: AbortSignal; token?: string } = {}): Promise<SuccessResponse<{ liked: boolean }>> => {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/like`, { signal, headers });
        if (!response.ok) throw new Error(`좋아요 상태 조회 실패 (${response.status})`);
        return response.json();
    },
};

export const TAG_API = {
    getTags: async ({ signal }: { signal?: AbortSignal } = {}): Promise<SuccessResponse<TagInfo[]>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/tags`, { signal });
        if (!response.ok) throw new Error(`태그 목록을 불러오지 못했습니다 (${response.status})`);
        return response.json();
    },
};
