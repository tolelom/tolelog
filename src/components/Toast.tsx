import type { ToastItem } from '../context/ToastContext';
import './Toast.css';

interface ToastProps {
    item: ToastItem;
    onDismiss: (id: string) => void;
    onHoverStart: (id: string) => void;
    onHoverEnd: (id: string) => void;
}

export function Toast({ item, onDismiss, onHoverStart, onHoverEnd }: ToastProps) {
    return (
        <div
            className={`toast toast--${item.type}`}
            role={item.type === 'error' ? 'alert' : 'status'}
            onMouseEnter={() => onHoverStart(item.id)}
            onMouseLeave={() => onHoverEnd(item.id)}
        >
            <span className="toast__message">{item.message}</span>
            <button
                type="button"
                className="toast__close"
                aria-label="닫기"
                onClick={() => onDismiss(item.id)}
            >
                ×
            </button>
        </div>
    );
}
