import { STORAGE_KEYS } from '../constants';
import { request } from './client';
import type { SuccessResponse, AuthData, User } from '../../types';

export const AUTH_API = {
    login: async (username: string, password: string): Promise<SuccessResponse<AuthData>> => {
        return request('/api/v1/auth/login', { method: 'POST', json: { username, password }, errorMessage: '로그인에 실패했습니다' });
    },

    register: async (username: string, password: string): Promise<SuccessResponse<AuthData>> => {
        return request('/api/v1/auth/register', { method: 'POST', json: { username, password }, errorMessage: '회원가입에 실패했습니다' });
    },

    // 서버는 다른 기기의 세션을 끊고 이 기기용 새 토큰 쌍을 돌려준다.
    changePassword: async (currentPassword: string, newPassword: string, token: string): Promise<SuccessResponse<AuthData>> => {
        return request('/api/v1/users/password', {
            method: 'PUT', auth: 'required', token, json: { current_password: currentPassword, new_password: newPassword },
            errorMessage: '비밀번호 변경에 실패했습니다',
        });
    },

    // 서버 에러여도 클라이언트 로그아웃은 진행한다. 진행 중에 토큰이 갱신돼 저장됐을 수 있어 끝나면 저장소를 비운다.
    logout: async (token: string): Promise<void> => {
        try {
            await request('/api/v1/auth/logout', { method: 'POST', auth: 'required', token });
        } catch {
            // 무시
        } finally {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
        }
    },

    deleteAccount: async (token: string): Promise<void> => {
        await request('/api/v1/users/me', { method: 'DELETE', auth: 'required', token, errorMessage: '계정 삭제에 실패했습니다' });
    },
};

export const USER_API = {
    getProfile: async (userId: number | string, { signal }: { signal?: AbortSignal } = {}): Promise<SuccessResponse<User>> => {
        return request(`/api/v1/users/${userId}`, { signal, errorMessage: '사용자 프로필을 불러오지 못했습니다' });
    },

    uploadAvatar: async (file: File, token: string): Promise<SuccessResponse<{ avatar_url: string }>> => {
        const formData = new FormData();
        formData.append('avatar', file);
        return request('/api/v1/users/avatar', { method: 'PUT', auth: 'required', token, formData, errorMessage: '프로필 이미지 업로드 실패' });
    },
};
