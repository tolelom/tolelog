import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureException, initErrorReporting } from '../errorReporting';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
});

describe('errorReporting', () => {
    it('logs to console when no DSN is configured', () => {
        captureException(new Error('boom'));
        expect(consoleErrorSpy).toHaveBeenCalledWith('[Error]', expect.any(Error));
    });

    it('includes context when provided', () => {
        captureException(new Error('boom'), { source: 'unit-test' });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            '[Error]',
            expect.any(Error),
            expect.objectContaining({ source: 'unit-test' }),
        );
    });

    it('initErrorReporting is a no-op when DSN is unset', () => {
        // 이미 모듈이 로드되며 initialized=false 인 상태에서 init 호출. 두 번째 호출은 무동작.
        initErrorReporting();
        initErrorReporting(); // 두번째 호출도 안전해야
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
