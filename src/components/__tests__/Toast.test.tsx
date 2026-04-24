import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from '../Toast';
import type { ToastItem } from '../../context/ToastContext';

function item(overrides: Partial<ToastItem> = {}): ToastItem {
    return {
        id: '1',
        type: 'success',
        message: 'hello',
        createdAt: Date.now(),
        duration: 3000,
        ...overrides,
    };
}

describe('Toast', () => {
    it('renders message', () => {
        render(<Toast item={item()} onDismiss={() => {}} onHoverStart={() => {}} onHoverEnd={() => {}} />);
        expect(screen.getByText('hello')).toBeInTheDocument();
    });

    it('applies type-specific class', () => {
        const { container } = render(
            <Toast item={item({ type: 'error' })} onDismiss={() => {}} onHoverStart={() => {}} onHoverEnd={() => {}} />
        );
        expect(container.querySelector('.toast--error')).toBeInTheDocument();
    });

    it('calls onDismiss when close button clicked', () => {
        const onDismiss = vi.fn();
        render(<Toast item={item({ id: 'abc' })} onDismiss={onDismiss} onHoverStart={() => {}} onHoverEnd={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: '닫기' }));
        expect(onDismiss).toHaveBeenCalledWith('abc');
    });

    it('calls onHoverStart/onHoverEnd on mouse enter/leave', () => {
        const onHoverStart = vi.fn();
        const onHoverEnd = vi.fn();
        const { container } = render(
            <Toast item={item({ id: 'x' })} onDismiss={() => {}} onHoverStart={onHoverStart} onHoverEnd={onHoverEnd} />
        );
        const toast = container.querySelector('.toast') as HTMLElement;
        fireEvent.mouseEnter(toast);
        expect(onHoverStart).toHaveBeenCalledWith('x');
        fireEvent.mouseLeave(toast);
        expect(onHoverEnd).toHaveBeenCalledWith('x');
    });
});
