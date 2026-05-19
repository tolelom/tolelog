import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notify } from '../notify';
import { LIKE_API, AUTH_API } from '../api';
import { STORAGE_KEYS } from '../constants';

describe('authenticatedFetch 401 handling', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
        notify._unregister();
    });
    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('calls notify.error when refresh fails on 401', async () => {
        const errorSpy = vi.fn(() => '');
        notify._register({
            success: () => '',
            error: errorSpy,
            info: () => '',
            dismiss: () => {},
            dismissAll: () => {},
        });

        // No refresh token stored → tryRefreshToken returns null
        globalThis.fetch = vi.fn(() =>
            Promise.resolve(new Response(null, { status: 401 }))
        ) as typeof fetch;

        const { POST_API } = await import('../api');
        try {
            await POST_API.deletePost(1, 'stale-token');
        } catch {
            // expected to throw
        }

        expect(errorSpy).toHaveBeenCalledWith('세션이 만료되었습니다. 다시 로그인해주세요.', undefined);
    });
});

// authenticatedFetch 는 비공개라 LIKE_API.toggle 을 통해 간접 테스트한다.

type FetchMock = ReturnType<typeof vi.fn>;
let fetchMock: FetchMock;

function jsonOk(body: unknown): Response {
    return {
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
    } as unknown as Response;
}

function jsonError(status: number, body: unknown = { error: 'err' }): Response {
    return {
        ok: false,
        status,
        json: () => Promise.resolve(body),
    } as unknown as Response;
}

beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('authenticatedFetch via LIKE_API.toggle', () => {
    it('throws immediately when no token is given', async () => {
        await expect(LIKE_API.toggle(1, '')).rejects.toThrow('로그인이 필요합니다');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns body on 200', async () => {
        fetchMock.mockResolvedValueOnce(jsonOk({ status: 'success', data: { liked: true, like_count: 1 } }));
        const res = await LIKE_API.toggle(1, 'tok');
        expect(res.data.liked).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const firstCallHeaders = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
        expect(firstCallHeaders.Authorization).toBe('Bearer tok');
    });

    it('refreshes token on 401 and retries successfully', async () => {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'old-refresh');

        fetchMock
            // 첫 시도: 401
            .mockResolvedValueOnce(jsonError(401))
            // refresh 호출: 새 토큰 발급
            .mockResolvedValueOnce(jsonOk({
                status: 'success',
                data: { access_token: 'new-tok', refresh_token: 'new-refresh' },
            }))
            // 재시도: 성공
            .mockResolvedValueOnce(jsonOk({ status: 'success', data: { liked: false, like_count: 0 } }));

        const res = await LIKE_API.toggle(1, 'tok');
        expect(res.data.like_count).toBe(0);
        expect(fetchMock).toHaveBeenCalledTimes(3);

        // localStorage 가 새 토큰으로 갱신됐는지
        expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe('new-tok');
        expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe('new-refresh');

        // 재시도 호출이 새 토큰을 사용했는지
        const retryHeaders = (fetchMock.mock.calls[2][1] as RequestInit).headers as Record<string, string>;
        expect(retryHeaders.Authorization).toBe('Bearer new-tok');
    });

    it('throws and clears storage when refresh token is missing', async () => {
        fetchMock.mockResolvedValueOnce(jsonError(401));
        await expect(LIKE_API.toggle(1, 'tok')).rejects.toThrow('인증이 만료되었습니다');
        // refresh 호출은 시도되지 않음 (token 없음)
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('clears storage and throws when refresh endpoint returns 401', async () => {
        localStorage.setItem(STORAGE_KEYS.TOKEN, 'tok');
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'bad-refresh');
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ username: 'a', user_id: 1 }));

        fetchMock
            .mockResolvedValueOnce(jsonError(401))   // first call
            .mockResolvedValueOnce(jsonError(401));  // refresh

        await expect(LIKE_API.toggle(1, 'tok')).rejects.toThrow('인증이 만료되었습니다');
        // 모든 토큰/사용자 정보가 정리되어야 함
        expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
        expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
        expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
    });

    it('throws with server message on 4xx', async () => {
        fetchMock.mockResolvedValueOnce(jsonError(400, { error: '잘못된 요청' }));
        await expect(LIKE_API.toggle(1, 'tok')).rejects.toThrow('잘못된 요청');
    });

    it('throws generic message on 5xx without body', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.reject(new Error('not json')),
        } as unknown as Response);
        await expect(LIKE_API.toggle(1, 'tok')).rejects.toThrow(/요청 실패 \(500\)/);
    });

    it('throws with retry response error when retry also fails', async () => {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'good-refresh');

        fetchMock
            .mockResolvedValueOnce(jsonError(401))
            .mockResolvedValueOnce(jsonOk({
                status: 'success',
                data: { access_token: 'new-tok', refresh_token: 'new-refresh' },
            }))
            .mockResolvedValueOnce(jsonError(403, { error: '권한 없음' }));

        await expect(LIKE_API.toggle(1, 'tok')).rejects.toThrow('권한 없음');
    });

    it('coalesces concurrent 401 retries — refresh endpoint called only once', async () => {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'good-refresh');

        // 두 개의 동시 요청이 둘 다 401 을 받고, 단 하나의 refresh 호출이 이루어진 뒤
        // 두 요청이 모두 새 토큰으로 재시도되어야 한다.
        fetchMock.mockImplementation((url: string, init?: RequestInit) => {
            const headers = (init?.headers as Record<string, string> | undefined) ?? {};
            // refresh 엔드포인트
            if (url.endsWith('/api/v1/auth/refresh')) {
                return Promise.resolve(jsonOk({
                    status: 'success',
                    data: { access_token: 'new-tok', refresh_token: 'new-refresh' },
                }));
            }
            // 새 토큰이면 200, 옛 토큰이면 401
            if (headers.Authorization === 'Bearer new-tok') {
                return Promise.resolve(jsonOk({ status: 'success', data: { liked: true, like_count: 1 } }));
            }
            return Promise.resolve(jsonError(401));
        });

        const [a, b] = await Promise.all([
            LIKE_API.toggle(1, 'tok'),
            LIKE_API.toggle(2, 'tok'),
        ]);
        expect(a.data.liked).toBe(true);
        expect(b.data.liked).toBe(true);

        const refreshCalls = fetchMock.mock.calls.filter((call) => String(call[0]).endsWith('/api/v1/auth/refresh'));
        expect(refreshCalls).toHaveLength(1);
    });
});

describe('AUTH_API.login', () => {
    it('returns auth data on success', async () => {
        fetchMock.mockResolvedValueOnce(jsonOk({
            status: 'success',
            data: { access_token: 'a', refresh_token: 'b' },
        }));
        const res = await AUTH_API.login('user', 'pass');
        expect(res.data.access_token).toBe('a');
    });

    it('throws with server error message', async () => {
        fetchMock.mockResolvedValueOnce(jsonError(401, { error: '비밀번호가 틀렸습니다' }));
        await expect(AUTH_API.login('user', 'wrong')).rejects.toThrow('비밀번호가 틀렸습니다');
    });

    it('throws generic message when server returns non-json error', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.reject(new Error('not json')),
        } as unknown as Response);
        await expect(AUTH_API.login('u', 'p')).rejects.toThrow('로그인에 실패했습니다');
    });
});
