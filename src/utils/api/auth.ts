import { API_BASE_URL } from '../constants';
import { authenticatedFetch } from './client';
import type { SuccessResponse, AuthData, User } from '../../types';

export const AUTH_API = {
    login: async (username: string, password: string): Promise<SuccessResponse<AuthData>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || '로그인에 실패했습니다');
        }
        return response.json();
    },

    register: async (username: string, password: string): Promise<SuccessResponse<AuthData>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || '회원가입에 실패했습니다');
        }
        return response.json();
    },

    refresh: async (refreshToken: string): Promise<SuccessResponse<AuthData>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || '토큰 갱신에 실패했습니다');
        }
        return response.json();
    },

    changePassword: async (currentPassword: string, newPassword: string, token: string): Promise<SuccessResponse<null>> => {
        return authenticatedFetch<SuccessResponse<null>>(`${API_BASE_URL}/api/v1/users/password`, 'PUT', token, {
            current_password: currentPassword,
            new_password: newPassword,
        });
    },

    logout: async (token: string): Promise<void> => {
        try {
            await authenticatedFetch<unknown>(`${API_BASE_URL}/api/v1/auth/logout`, 'POST', token);
        } catch {
            // 서버 에러여도 클라이언트 로그아웃 진행
        }
    },

    deleteAccount: async (token: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.status !== 204 && !response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || '계정 삭제에 실패했습니다');
        }
    },
};

export const USER_API = {
    getProfile: async (userId: number | string, { signal }: { signal?: AbortSignal } = {}): Promise<SuccessResponse<User>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, { signal });
        if (!response.ok) {
            throw new Error(`사용자 프로필을 불러오지 못했습니다 (${response.status})`);
        }
        return response.json();
    },

    uploadAvatar: async (file: File, token: string): Promise<SuccessResponse<{ avatar_url: string }>> => {
        if (!token) {
            throw new Error('토큰이 필요합니다');
        }

        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch(`${API_BASE_URL}/api/v1/users/avatar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `프로필 이미지 업로드 실패: ${response.status}`);
        }

        return response.json();
    },
};
