import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ToastContainer } from '../ToastContainer';
import type { ToastItem } from '../../context/ToastContext';

function item(overrides: Partial<ToastItem> = {}): ToastItem {
    return { id: '1', type: 'success', message: 'msg', createdAt: 1, duration: 3000, ...overrides };
}

describe('ToastContainer', () => {
    it('renders into document.body via portal', () => {
        render(
            <ToastContainer
                toasts={[item()]}
                onDismiss={() => {}}
                onHoverStart={() => {}}
                onHoverEnd={() => {}}
            />
        );
        const container = document.body.querySelector('.toast-container');
        expect(container).not.toBeNull();
    });

    it('renders one Toast per item', () => {
        render(
            <ToastContainer
                toasts={[item({ id: 'a' }), item({ id: 'b', type: 'error' })]}
                onDismiss={() => {}}
                onHoverStart={() => {}}
                onHoverEnd={() => {}}
            />
        );
        expect(document.body.querySelectorAll('.toast').length).toBe(2);
    });

    it('splits items into polite/assertive aria-live regions', () => {
        render(
            <ToastContainer
                toasts={[item({ id: 'a', type: 'success' }), item({ id: 'b', type: 'error' })]}
                onDismiss={() => {}}
                onHoverStart={() => {}}
                onHoverEnd={() => {}}
            />
        );
        expect(document.body.querySelector('[aria-live="polite"]')).not.toBeNull();
        expect(document.body.querySelector('[aria-live="assertive"]')).not.toBeNull();
    });
});
