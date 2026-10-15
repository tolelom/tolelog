import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AUTH_API, COMMENT_API, IMAGE_API, LIKE_API, POST_API } from '../api';
import { AUTH_TOKENS_EVENT } from '../api/client';
import { STORAGE_KEYS } from '../constants';

// 백엔드 오류 응답은 { status: 'error', error: <코드>, message: <사용자 문구> } 이다.

function jsonResponse(status: number, body: unknown): Response {
    return { ok: status < 400, status, json: () => Promise.resolve(body) } as unknown as Response;
}

function jwt(expSecondsFromNow: number): string {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `h.${payload}.s`;
}

const refreshed = { status: 'success', data: { access_token: 'new-access', refresh_token: 'new-refresh', username: 'u', user_id: 1, avatar_url: '' } };

function authHeader(call: unknown[]): string | undefined {
    return ((call[1] as RequestInit | undefined)?.headers as Record<string, string> | undefined)?.Authorization;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('오류 문구', () => {
    it('오류 코드가 아니라 사용자 문구를 보여 준다', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(403, { status: 'error', error: 'invalid_current_password', message: '현재 비밀번호가 올바르지 않습니다' }));
        await expect(AUTH_API.changePassword('a', 'b', 'tok')).rejects.toThrow('현재 비밀번호가 올바르지 않습니다');
    });

    it('로그인 실패도 문구를 보여 준다', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(401, { status: 'error', error: 'invalid_credentials', message: '사용자명 또는 비밀번호가 잘못되었습니다' }));
        await expect(AUTH_API.login('u', 'p')).rejects.toThrow('사용자명 또는 비밀번호가 잘못되었습니다');
    });

    it('문구가 없으면 오류 코드 대신 상태 코드를 담은 기본 문구를 쓴다', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(500, { status: 'error', error: 'like_failed' }));
        await expect(LIKE_API.toggle(1, 'tok')).rejects.toThrow(/\(500\)/);
        fetchMock.mockResolvedValueOnce(jsonResponse(500, { status: 'error', error: 'like_failed' }));
        await expect(LIKE_API.toggle(1, 'tok')).rejects.not.toThrow('like_failed');
    });
});

describe('로그인이 필요한 요청의 토큰 갱신', () => {
    beforeEach(() => {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'good-refresh');
    });

    it('댓글 작성이 401 을 받으면 갱신한 토큰으로 다시 보낸다', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401, { status: 'error', error: 'unauthorized', message: '인증이 필요합니다' }))
            .mockResolvedValueOnce(jsonResponse(200, refreshed))
            .mockResolvedValueOnce(jsonResponse(201, { status: 'success', data: { id: 5 } }));

        const res = await COMMENT_API.createComment(1, '안녕', 'old-access');

        expect(res.data).toEqual({ id: 5 });
        expect(authHeader(fetchMock.mock.calls[2])).toBe('Bearer new-access');
    });

    it('이미지 업로드도 갱신 뒤 같은 파일을 다시 보낸다', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401, { status: 'error', error: 'unauthorized', message: '인증이 필요합니다' }))
            .mockResolvedValueOnce(jsonResponse(200, refreshed))
            .mockResolvedValueOnce(jsonResponse(200, { status: 'success', data: { url: '/uploads/images/a.png' } }));

        const res = await IMAGE_API.upload(new File(['x'], 'a.png', { type: 'image/png' }), 'old-access');

        expect(res.data.url).toBe('/uploads/images/a.png');
        const retry = fetchMock.mock.calls[2][1] as RequestInit;
        expect((retry.headers as Record<string, string>).Authorization).toBe('Bearer new-access');
        expect(retry.body).toBeInstanceOf(FormData);
    });

    it('갱신한 토큰을 앱에 알린다', async () => {
        const onTokens = vi.fn();
        window.addEventListener(AUTH_TOKENS_EVENT, onTokens);
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401, { status: 'error', error: 'unauthorized', message: '' }))
            .mockResolvedValueOnce(jsonResponse(200, refreshed))
            .mockResolvedValueOnce(jsonResponse(200, { status: 'success', data: { liked: true, like_count: 1 } }));

        await LIKE_API.toggle(1, 'old-access');

        window.removeEventListener(AUTH_TOKENS_EVENT, onTokens);
        expect(onTokens).toHaveBeenCalledTimes(1);
        expect((onTokens.mock.calls[0][0] as CustomEvent).detail).toEqual({ token: 'new-access', refreshToken: 'new-refresh' });
    });

    it('갱신에 실패하면 로그아웃을 앱에 알린다', async () => {
        const onTokens = vi.fn();
        window.addEventListener(AUTH_TOKENS_EVENT, onTokens);
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401, { status: 'error', error: 'unauthorized', message: '' }))
            .mockResolvedValueOnce(jsonResponse(401, { status: 'error', error: 'invalid_refresh_token', message: '' }));

        await expect(LIKE_API.toggle(1, 'old-access')).rejects.toThrow();

        window.removeEventListener(AUTH_TOKENS_EVENT, onTokens);
        expect((onTokens.mock.calls[0][0] as CustomEvent).detail).toBeNull();
    });
});

describe('로그인하면 더 보이는 읽기 요청', () => {
    it('만료된 액세스 토큰은 먼저 갱신하고 새 토큰으로 읽는다 (만료 토큰은 서버가 익명으로 본다)', async () => {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'good-refresh');
        fetchMock
            .mockResolvedValueOnce(jsonResponse(200, refreshed))
            .mockResolvedValueOnce(jsonResponse(200, { status: 'success', data: { id: 1 } }));

        await POST_API.getPost(1, { token: jwt(-60) });

        expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/refresh$/);
        expect(authHeader(fetchMock.mock.calls[1])).toBe('Bearer new-access');
    });

    it('갱신이 안 되면 토큰 없이 공개 범위만 읽는다', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: 'success', data: { id: 1 } }));

        await POST_API.getPost(1, { token: jwt(-60) });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(authHeader(fetchMock.mock.calls[0])).toBeUndefined();
    });

    it('아직 유효한 토큰은 그대로 보낸다', async () => {
        const token = jwt(600);
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: 'success', data: { id: 1 } }));

        await POST_API.getPost(1, { token });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(authHeader(fetchMock.mock.calls[0])).toBe(`Bearer ${token}`);
    });
});
