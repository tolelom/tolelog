import { request } from './client';
import type { SuccessResponse, Series, SeriesDetail, SeriesNav } from '../../types';

export const SERIES_API = {
    getSeries: async (seriesId: number | string, { signal, token }: { signal?: AbortSignal; token?: string } = {}): Promise<SuccessResponse<SeriesDetail>> => {
        return request(`/api/v1/series/${seriesId}`, { auth: 'optional', token, signal, errorMessage: '시리즈를 불러오지 못했습니다' });
    },
    // 글 수는 작성자에게만 비공개·초안까지 센다.
    getUserSeries: async (userId: number | string, { signal, token }: { signal?: AbortSignal; token?: string | null } = {}): Promise<SuccessResponse<Series[]>> => {
        return request(`/api/v1/users/${userId}/series`, { auth: 'optional', token, signal, errorMessage: '시리즈 목록을 불러오지 못했습니다' });
    },
    createSeries: async (title: string, description: string, token: string): Promise<SuccessResponse<Series>> => {
        return request('/api/v1/series', { method: 'POST', auth: 'required', token, json: { title, description } });
    },
    updateSeries: async (seriesId: number | string, title: string, description: string, token: string): Promise<SuccessResponse<Series>> => {
        return request(`/api/v1/series/${seriesId}`, { method: 'PUT', auth: 'required', token, json: { title, description } });
    },
    deleteSeries: async (seriesId: number | string, token: string): Promise<SuccessResponse<null>> => {
        return request(`/api/v1/series/${seriesId}`, { method: 'DELETE', auth: 'required', token });
    },
    addPost: async (seriesId: number | string, postId: number, order: number, token: string): Promise<SuccessResponse<null>> => {
        return request(`/api/v1/series/${seriesId}/posts`, { method: 'POST', auth: 'required', token, json: { post_id: postId, order } });
    },
    removePost: async (seriesId: number | string, postId: number, token: string): Promise<SuccessResponse<null>> => {
        return request(`/api/v1/series/${seriesId}/posts/${postId}`, { method: 'DELETE', auth: 'required', token });
    },
    reorderPosts: async (seriesId: number | string, postIds: number[], token: string): Promise<SuccessResponse<null>> => {
        return request(`/api/v1/series/${seriesId}/reorder`, { method: 'PUT', auth: 'required', token, json: { post_ids: postIds } });
    },
    getSeriesNav: async (postId: number | string, { signal, token }: { signal?: AbortSignal; token?: string } = {}): Promise<SuccessResponse<SeriesNav | null>> => {
        return request(`/api/v1/posts/${postId}/series-nav`, { auth: 'optional', token, signal, errorMessage: '시리즈 네비게이션 조회 실패' });
    },
};
