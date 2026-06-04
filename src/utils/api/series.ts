import { API_BASE_URL } from '../constants';
import { authenticatedFetch } from './client';
import type { SuccessResponse, Series, SeriesDetail, SeriesNav } from '../../types';

export const SERIES_API = {
    getSeries: async (seriesId: number | string, { signal }: { signal?: AbortSignal } = {}): Promise<SuccessResponse<SeriesDetail>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/series/${seriesId}`, { signal });
        if (!response.ok) throw new Error(`시리즈를 불러오지 못했습니다 (${response.status})`);
        return response.json();
    },
    getUserSeries: async (userId: number | string, { signal }: { signal?: AbortSignal } = {}): Promise<SuccessResponse<Series[]>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/series`, { signal });
        if (!response.ok) throw new Error(`시리즈 목록을 불러오지 못했습니다 (${response.status})`);
        return response.json();
    },
    createSeries: async (title: string, description: string, token: string): Promise<SuccessResponse<Series>> => {
        return authenticatedFetch<SuccessResponse<Series>>(`${API_BASE_URL}/api/v1/series`, 'POST', token, { title, description });
    },
    updateSeries: async (seriesId: number | string, title: string, description: string, token: string): Promise<SuccessResponse<Series>> => {
        return authenticatedFetch<SuccessResponse<Series>>(`${API_BASE_URL}/api/v1/series/${seriesId}`, 'PUT', token, { title, description });
    },
    deleteSeries: async (seriesId: number | string, token: string): Promise<SuccessResponse<null>> => {
        return authenticatedFetch<SuccessResponse<null>>(`${API_BASE_URL}/api/v1/series/${seriesId}`, 'DELETE', token);
    },
    addPost: async (seriesId: number | string, postId: number, order: number, token: string): Promise<SuccessResponse<null>> => {
        return authenticatedFetch<SuccessResponse<null>>(`${API_BASE_URL}/api/v1/series/${seriesId}/posts`, 'POST', token, { post_id: postId, order });
    },
    removePost: async (seriesId: number | string, postId: number, token: string): Promise<SuccessResponse<null>> => {
        return authenticatedFetch<SuccessResponse<null>>(`${API_BASE_URL}/api/v1/series/${seriesId}/posts/${postId}`, 'DELETE', token);
    },
    reorderPosts: async (seriesId: number | string, postIds: number[], token: string): Promise<SuccessResponse<null>> => {
        return authenticatedFetch<SuccessResponse<null>>(`${API_BASE_URL}/api/v1/series/${seriesId}/reorder`, 'PUT', token, { post_ids: postIds });
    },
    getSeriesNav: async (postId: number | string, { signal }: { signal?: AbortSignal } = {}): Promise<SuccessResponse<SeriesNav | null>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/series-nav`, { signal });
        if (!response.ok) throw new Error(`시리즈 네비게이션 조회 실패 (${response.status})`);
        return response.json();
    },
};
