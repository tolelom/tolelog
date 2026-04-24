import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useToast } from '../useToast';
import { ToastContext, type ToastContextValue } from '../../context/ToastContext';

describe('useToast', () => {
    it('returns the value from ToastContext', () => {
        const mockValue: ToastContextValue = {
            toasts: [],
            toast: {
                success: () => 's',
                error: () => 'e',
                info: () => 'i',
                dismiss: () => {},
                dismissAll: () => {},
            },
        };
        const wrapper = ({ children }: { children: ReactNode }) => (
            <ToastContext.Provider value={mockValue}>{children}</ToastContext.Provider>
        );
        const { result } = renderHook(() => useToast(), { wrapper });
        expect(result.current.toast.success('x')).toBe('s');
    });
});
