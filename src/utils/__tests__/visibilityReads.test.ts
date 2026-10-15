import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { COMMENT_API, SERIES_API } from '../api';

// 비공개·draft 글의 댓글/시리즈는 서버가 작성자에게만 보여준다.
// 작성자가 자기 글을 계속 보려면 이 읽기 요청들이 토큰을 실어 보내야 한다.
const reads = {
    'COMMENT_API.getComments': (token?: string) => COMMENT_API.getComments(1, { token }),
    'SERIES_API.getSeries': (token?: string) => SERIES_API.getSeries(1, { token }),
    'SERIES_API.getSeriesNav': (token?: string) => SERIES_API.getSeriesNav(1, { token }),
    'SERIES_API.getUserSeries': (token?: string) => SERIES_API.getUserSeries(1, { token }),
};

describe.each(Object.entries(reads))('%s', (_name, read) => {
    const originalFetch = globalThis.fetch;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: 'success', data: null }) }));
        globalThis.fetch = fetchMock as unknown as typeof fetch;
    });
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    function sentAuthorization(): string | undefined {
        const init = fetchMock.mock.calls[0][1] as RequestInit | undefined;
        return (init?.headers as Record<string, string> | undefined)?.['Authorization'];
    }

    it('토큰이 있으면 Authorization 헤더를 보낸다', async () => {
        await read('T');
        expect(sentAuthorization()).toBe('Bearer T');
    });

    it('토큰이 없으면 Authorization 헤더를 보내지 않는다', async () => {
        await read(undefined);
        expect(sentAuthorization()).toBeUndefined();
    });
});
