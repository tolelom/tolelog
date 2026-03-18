import { API_BASE_URL, STORAGE_KEYS } from './constants';
import type { SuccessResponse, AuthData, User, Post, PostListWithPagination, Comment as CommentType, CommentListResponse, Series, SeriesDetail, SeriesNav } from '../types';

interface ApiError extends Error {
    status?: number;
}

async function tryRefreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
            return null;
        }

        const data: SuccessResponse<AuthData> = await response.json();
        localStorage.setItem(STORAGE_KEYS.TOKEN, data.data.access_token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.data.refresh_token);
        return data.data.access_token;
    } catch {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        return null;
    }
}

async function authenticatedFetch(url: string, method: string, token: string, body: Record<string, unknown> | null = null): Promise<unknown> {
    if (!token) {
        const err: ApiError = new Error('로그인이 필요합니다');
        err.status = 401;
        throw err;
    }

    const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
    if (body) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (response.status === 401) {
        const newToken = await tryRefreshToken();
        if (newToken) {
            const retryHeaders: Record<string, string> = { 'Authorization': `Bearer ${newToken}` };
            if (body) {
                retryHeaders['Content-Type'] = 'application/json';
            }
            const retryResponse = await fetch(url, {
                method,
                headers: retryHeaders,
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
            if (!retryResponse.ok) {
                const errorData = await retryResponse.json().catch(() => ({}));
                const message = errorData.error || errorData.message || `요청 실패 (${retryResponse.status})`;
                const err: ApiError = new Error(message);
                err.status = retryResponse.status;
                throw err;
            }
            return retryResponse.json();
        }
        const err: ApiError = new Error('인증이 만료되었습니다');
        err.status = 401;
        throw err;
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || errorData.message || `요청 실패 (${response.status})`;
        const err: ApiError = new Error(message);
        err.status = response.status;
        throw err;
    }

    return response.json();
}

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

export const COMMENT_API = {
    getComments: async (postId: number | string, { signal }: { signal?: AbortSignal } = {}): Promise<SuccessResponse<CommentListResponse>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/comments`, { signal });
        if (!response.ok) throw new Error(`댓글을 불러오지 못했습니다 (${response.status})`);
        return response.json();
    },
    createComment: async (postId: number | string, content: string, token: string): Promise<SuccessResponse<CommentType>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ content }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || `댓글 작성에 실패했습니다`);
        }
        return response.json();
    },
    deleteComment: async (postId: number | string, commentId: number, token: string): Promise<unknown> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || `댓글 삭제에 실패했습니다`);
        }
        return response.json();
    },
};

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
        return authenticatedFetch(`${API_BASE_URL}/api/v1/series`, 'POST', token, { title, description }) as Promise<SuccessResponse<Series>>;
    },
    updateSeries: async (seriesId: number | string, title: string, description: string, token: string): Promise<SuccessResponse<Series>> => {
        return authenticatedFetch(`${API_BASE_URL}/api/v1/series/${seriesId}`, 'PUT', token, { title, description }) as Promise<SuccessResponse<Series>>;
    },
    deleteSeries: async (seriesId: number | string, token: string): Promise<unknown> => {
        return authenticatedFetch(`${API_BASE_URL}/api/v1/series/${seriesId}`, 'DELETE', token);
    },
    addPost: async (seriesId: number | string, postId: number, order: number, token: string): Promise<unknown> => {
        return authenticatedFetch(`${API_BASE_URL}/api/v1/series/${seriesId}/posts`, 'POST', token, { post_id: postId, order });
    },
    removePost: async (seriesId: number | string, postId: number, token: string): Promise<unknown> => {
        return authenticatedFetch(`${API_BASE_URL}/api/v1/series/${seriesId}/posts/${postId}`, 'DELETE', token);
    },
    reorderPosts: async (seriesId: number | string, postIds: number[], token: string): Promise<unknown> => {
        return authenticatedFetch(`${API_BASE_URL}/api/v1/series/${seriesId}/reorder`, 'PUT', token, { post_ids: postIds });
    },
    getSeriesNav: async (postId: number | string, { signal }: { signal?: AbortSignal } = {}): Promise<SuccessResponse<SeriesNav | null>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/series-nav`, { signal });
        if (!response.ok) throw new Error(`시리즈 네비게이션 조회 실패 (${response.status})`);
        return response.json();
    },
};

export const LIKE_API = {
    toggle: async (postId: number | string, token: string): Promise<SuccessResponse<{ liked: boolean; like_count: number }>> => {
        return authenticatedFetch(`${API_BASE_URL}/api/v1/posts/${postId}/like`, 'POST', token) as Promise<SuccessResponse<{ liked: boolean; like_count: number }>>;
    },
    getStatus: async (postId: number | string, { signal, token }: { signal?: AbortSignal; token?: string } = {}): Promise<SuccessResponse<{ liked: boolean }>> => {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/like`, { signal, headers });
        if (!response.ok) throw new Error(`좋아요 상태 조회 실패 (${response.status})`);
        return response.json();
    },
};

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

    createPost: async (title: string, content: string, isPublic: boolean = true, token: string, tags: string = ''): Promise<unknown> => {
        return authenticatedFetch(
            `${API_BASE_URL}/api/v1/posts`,
            'POST',
            token,
            { title, content, is_public: isPublic, tags }
        );
    },

    updatePost: async (postId: number | string, title: string, content: string, isPublic: boolean = true, token: string, tags: string = ''): Promise<unknown> => {
        return authenticatedFetch(
            `${API_BASE_URL}/api/v1/posts/${postId}`,
            'PUT',
            token,
            { title, content, is_public: isPublic, tags }
        );
    },

    deletePost: async (postId: number | string, token: string): Promise<unknown> => {
        return authenticatedFetch(
            `${API_BASE_URL}/api/v1/posts/${postId}`,
            'DELETE',
            token
        );
    },
};
