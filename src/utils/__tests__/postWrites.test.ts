import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST_API } from '../api';

describe('POST_API.updatePost', () => {
    const originalFetch = globalThis.fetch;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ status: 'success', data: { id: 1 } }) }));
        globalThis.fetch = fetchMock as unknown as typeof fetch;
    });
    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    // 편집기 저장은 곧 발행이다. status 를 안 보내면 draft 를 열어 저장해도 draft 로 남는다.
    it('status=published 를 함께 보낸다', async () => {
        await POST_API.updatePost(1, '제목', '본문', true, 'T', '');
        const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        expect(body.status).toBe('published');
    });
});
