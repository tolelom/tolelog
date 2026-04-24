import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notify } from '../notify';

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
