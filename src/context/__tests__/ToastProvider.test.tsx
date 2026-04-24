import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ToastProvider';
import { useToast } from '../../hooks/useToast';
import { notify } from '../../utils/notify';

function Consumer() {
    const { toast, toasts } = useToast();
    return (
        <>
            <button onClick={() => toast.success('ok')}>s</button>
            <button onClick={() => toast.error('bad')}>e</button>
            <button onClick={() => toast.info('hi')}>i</button>
            <div data-testid="count">{toasts.length}</div>
        </>
    );
}

describe('ToastProvider', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    });
    afterEach(() => {
        vi.useRealTimers();
        notify._unregister();
    });

    it('notify.error before provider mounts logs a warning', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        notify._unregister(); // ensure no provider registered
        notify.error('too early');
        expect(warn).toHaveBeenCalledWith('[notify] ToastProvider not mounted');
        warn.mockRestore();
    });

    it('appends toasts to the queue', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('s'));
        fireEvent.click(screen.getByText('e'));
        expect(screen.getByTestId('count').textContent).toBe('2');
    });

    it('caps the queue at 3, evicting oldest', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        const btn = screen.getByText('s');
        fireEvent.click(btn);
        fireEvent.click(btn);
        fireEvent.click(btn);
        fireEvent.click(btn);
        expect(screen.getByTestId('count').textContent).toBe('3');
    });

    it('auto-dismisses a success toast after 3000ms', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('s'));
        expect(screen.getByTestId('count').textContent).toBe('1');
        act(() => { vi.advanceTimersByTime(3000); });
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('auto-dismisses an error toast after 6000ms (not 3000ms)', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('e'));
        act(() => { vi.advanceTimersByTime(3000); });
        expect(screen.getByTestId('count').textContent).toBe('1');
        act(() => { vi.advanceTimersByTime(3000); });
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('hover pauses the timer, and leaving restarts with remaining duration', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('s'));
        const toast = document.body.querySelector('.toast') as HTMLElement;
        act(() => { vi.advanceTimersByTime(1000); });
        fireEvent.mouseEnter(toast);
        act(() => { vi.advanceTimersByTime(5000); });
        expect(screen.getByTestId('count').textContent).toBe('1');
        fireEvent.mouseLeave(toast);
        act(() => { vi.advanceTimersByTime(1999); });
        expect(screen.getByTestId('count').textContent).toBe('1');
        act(() => { vi.advanceTimersByTime(1); });
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('ESC key dismisses the most recent toast', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('s'));
        fireEvent.click(screen.getByText('s'));
        expect(screen.getByTestId('count').textContent).toBe('2');
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.getByTestId('count').textContent).toBe('1');
    });

    it('registers notify singleton so external calls push toasts', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        act(() => { notify.error('from util'); });
        expect(screen.getByTestId('count').textContent).toBe('1');
        expect(screen.getByText('from util')).toBeInTheDocument();
    });

    it('close button dismisses specific toast', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('s'));
        fireEvent.click(screen.getByRole('button', { name: '닫기' }));
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('custom duration overrides default', () => {
        function Custom() {
            const { toast, toasts } = useToast();
            return (
                <>
                    <button onClick={() => toast.success('ok', { duration: 100 })}>custom</button>
                    <div data-testid="count">{toasts.length}</div>
                </>
            );
        }
        render(
            <ToastProvider>
                <Custom />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('custom'));
        act(() => { vi.advanceTimersByTime(100); });
        expect(screen.getByTestId('count').textContent).toBe('0');
    });
});
