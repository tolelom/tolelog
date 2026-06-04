import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { notify } from '../notify';
import type { SuccessResponse, AuthData } from '../../types';

export interface ApiError extends Error {
    status?: number;
}

// 동시에 여러 요청이 401 을 받으면 refresh 가 중복 호출되어
// 첫 호출에서 발급된 새 refresh_token 이 두 번째 호출 시 invalid 가 되는 race 가 있다.
// in-flight Promise 를 캐싱해 refresh 엔드포인트를 한 번만 호출하도록 보장.
let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
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

async function tryRefreshToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = doRefresh().finally(() => {
        refreshInFlight = null;
    });
    return refreshInFlight;
}

export async function authenticatedFetch<T = unknown>(url: string, method: string, token: string, body: Record<string, unknown> | null = null): Promise<T> {
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
            if (retryResponse.status === 204) return { status: 'success', data: null } as T;
            return retryResponse.json();
        }
        notify.error('세션이 만료되었습니다. 다시 로그인해주세요.');
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

    if (response.status === 204) return { status: 'success', data: null } as T;
    return response.json();
}
