import { createPortal } from 'react-dom';
import { Toast } from './Toast';
import type { ToastItem } from '../context/ToastContext';

interface ToastContainerProps {
    toasts: ToastItem[];
    onDismiss: (id: string) => void;
    onHoverStart: (id: string) => void;
    onHoverEnd: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss, onHoverStart, onHoverEnd }: ToastContainerProps) {
    const polite = toasts.filter(t => t.type !== 'error');
    const assertive = toasts.filter(t => t.type === 'error');

    return createPortal(
        <div className="toast-container">
            <div aria-live="polite" aria-atomic="false" className="toast-region">
                {polite.map(t => (
                    <Toast key={t.id} item={t} onDismiss={onDismiss} onHoverStart={onHoverStart} onHoverEnd={onHoverEnd} />
                ))}
            </div>
            <div aria-live="assertive" aria-atomic="false" className="toast-region">
                {assertive.map(t => (
                    <Toast key={t.id} item={t} onDismiss={onDismiss} onHoverStart={onHoverStart} onHoverEnd={onHoverEnd} />
                ))}
            </div>
        </div>,
        document.body
    );
}
