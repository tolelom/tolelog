import { request } from './client';
import type { SuccessResponse, TagInfo } from '../../types';

export const IMAGE_API = {
    upload: async (file: File, token: string): Promise<SuccessResponse<{ url: string }>> => {
        const formData = new FormData();
        formData.append('image', file);
        return request('/api/v1/upload', { method: 'POST', auth: 'required', token, formData, errorMessage: '이미지 업로드 실패' });
    },
};

export const LIKE_API = {
    toggle: async (postId: number | string, token: string): Promise<SuccessResponse<{ liked: boolean; like_count: number }>> => {
        return request(`/api/v1/posts/${postId}/like`, { method: 'POST', auth: 'required', token });
    },
    getStatus: async (postId: number | string, { signal, token }: { signal?: AbortSignal; token?: string } = {}): Promise<SuccessResponse<{ liked: boolean }>> => {
        return request(`/api/v1/posts/${postId}/like`, { auth: 'optional', token, signal, errorMessage: '좋아요 상태 조회 실패' });
    },
};

export const TAG_API = {
    getTags: async ({ signal }: { signal?: AbortSignal } = {}): Promise<SuccessResponse<TagInfo[]>> => {
        const body = await request<SuccessResponse<{ tags: { name: string; post_count: number }[] }>>('/api/v1/tags', {
            signal, errorMessage: '태그 목록을 불러오지 못했습니다',
        });
        return { ...body, data: (body.data?.tags ?? []).map((t) => ({ name: t.name, count: t.post_count })) };
    },
};
