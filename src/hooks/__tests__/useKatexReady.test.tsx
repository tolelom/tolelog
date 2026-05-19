import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// markdownParser 모듈을 모킹해서 KaTeX 로드 상태를 제어한다.
const subscribers = new Set<() => void>();
let katexReady = false;

vi.mock('../../utils/markdownParser', () => ({
    isKatexReady: () => katexReady,
    subscribeKatexReady: (cb: () => void) => {
        subscribers.add(cb);
        return () => subscribers.delete(cb);
    },
}));

// 모킹 이후에 import (vitest hoisting 규칙)
import { useKatexReady } from '../useKatexReady';

beforeEach(() => {
    subscribers.clear();
    katexReady = false;
});

afterEach(() => {
    subscribers.clear();
});

describe('useKatexReady', () => {
    it('starts at version 0 when KaTeX is not ready', () => {
        const { result } = renderHook(() => useKatexReady());
        expect(result.current).toBe(0);
    });

    it('returns version 1 immediately when KaTeX is already ready', () => {
        katexReady = true;
        const { result } = renderHook(() => useKatexReady());
        expect(result.current).toBe(1);
    });

    it('increments version when a KaTeX-ready callback fires', () => {
        const { result } = renderHook(() => useKatexReady());
        expect(result.current).toBe(0);
        expect(subscribers.size).toBe(1);

        act(() => {
            subscribers.forEach((cb) => cb());
        });
        expect(result.current).toBe(1);
    });

    it('unsubscribes on unmount', () => {
        const { unmount } = renderHook(() => useKatexReady());
        expect(subscribers.size).toBe(1);
        unmount();
        expect(subscribers.size).toBe(0);
    });

    it('does not subscribe again if KaTeX is already ready at mount time', () => {
        katexReady = true;
        const { unmount } = renderHook(() => useKatexReady());
        expect(subscribers.size).toBe(0);
        unmount();
    });
});
