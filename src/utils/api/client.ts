import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { notify } from '../notify';
import type { SuccessResponse, AuthData } from '../../types';

export interface ApiError extends Error {
    status?: number;
}

// 토큰을 갱신하거나 갱신에 실패하면 이 이벤트로 AuthProvider 에 알린다. detail 이 null 이면 로그아웃이다.
export const AUTH_TOKENS_EVENT = 'tolelog:auth-tokens';

export interface AuthTokens {
    token: string;
    refreshToken: string;
}

// 만료 직전 토큰을 보내면 서버에 닿을 때 만료될 수 있어 조금 일찍 갱신한다.
const EXPIRY_MARGIN_SECONDS = 10;

function announceTokens(tokens: AuthTokens | null): void {
    window.dispatchEvent(new CustomEvent<AuthTokens | null>(AUTH_TOKENS_EVENT, { detail: tokens }));
}

function clearStoredSession(): void {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
}

async function doRefresh(): Promise<string | null> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!response.ok) throw new Error(`refresh failed (${response.status})`);

        const data: SuccessResponse<AuthData> = await response.json();
        localStorage.setItem(STORAGE_KEYS.TOKEN, data.data.access_token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.data.refresh_token);
        announceTokens({ token: data.data.access_token, refreshToken: data.data.refresh_token });
        return data.data.access_token;
    } catch {
        clearStoredSession();
        announceTokens(null);
        return null;
    }
}

// 동시에 여러 요청이 갱신하면 첫 호출에서 받은 새 refresh_token 이 두 번째 호출에서 무효가 된다.
// 진행 중인 갱신을 공유해 refresh 엔드포인트를 한 번만 부른다.
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
    if (!refreshInFlight) {
        refreshInFlight = doRefresh().finally(() => {
            refreshInFlight = null;
        });
    }
    return refreshInFlight;
}

function isExpired(token: string): boolean {
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const exp = (JSON.parse(json) as { exp?: number }).exp;
        return typeof exp === 'number' && exp - EXPIRY_MARGIN_SECONDS <= Date.now() / 1000;
    } catch {
        return false;
    }
}

// 만료된 토큰은 서버가 익명으로 보거나 401 을 주므로 보내기 전에 갱신한다. 갱신이 안 되면 null.
async function usableToken(token: string): Promise<string | null> {
    return isExpired(token) ? refreshAccessToken() : token;
}

export type AuthMode = 'none' | 'optional' | 'required';

export interface RequestOptions {
    method?: string;
    auth?: AuthMode;
    token?: string | null;
    json?: unknown;
    formData?: FormData;
    signal?: AbortSignal;
    // 서버가 문구를 주지 않을 때 쓸 문구. 뒤에 상태 코드가 붙는다.
    errorMessage?: string;
}

function apiError(message: string, status: number): ApiError {
    const err: ApiError = new Error(message);
    err.status = status;
    return err;
}

function sessionExpired(): ApiError {
    notify.error('세션이 만료되었습니다. 다시 로그인해주세요.');
    return apiError('인증이 만료되었습니다', 401);
}

function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let body: BodyInit | undefined;
    if (options.formData) {
        body = options.formData;
    } else if (options.json !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.json);
    }
    return fetch(`${API_BASE_URL}${path}`, { method: options.method ?? 'GET', headers, body, signal: options.signal });
}

async function readBody<T>(response: Response, options: RequestOptions): Promise<T> {
    if (!response.ok) {
        const data: { message?: string } = await response.json().catch(() => ({}));
        const fallback = `${options.errorMessage ?? '요청에 실패했습니다'} (${response.status})`;
        throw apiError(data.message || fallback, response.status);
    }
    if (response.status === 204) return { status: 'success', data: null } as T;
    return response.json();
}

// path 는 API_BASE_URL 뒤에 붙는 경로다(예: /api/v1/posts).
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const auth = options.auth ?? 'none';

    if (auth === 'required') {
        if (!options.token) throw apiError('로그인이 필요합니다', 401);
        const token = await usableToken(options.token);
        if (!token) throw sessionExpired();
        const response = await send(path, options, token);
        if (response.status !== 401) return readBody<T>(response, options);
        const retryToken = await refreshAccessToken();
        if (!retryToken) throw sessionExpired();
        return readBody<T>(await send(path, options, retryToken), options);
    }

    const token = auth === 'optional' && options.token ? await usableToken(options.token) : null;
    return readBody<T>(await send(path, options, token), options);
}
