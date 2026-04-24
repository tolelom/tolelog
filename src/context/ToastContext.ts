import { createContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
    createdAt: number;
    duration: number;
}

export interface ToastOptions {
    duration?: number;
}

export interface ToastApi {
    success(message: string, options?: ToastOptions): string;
    error(message: string, options?: ToastOptions): string;
    info(message: string, options?: ToastOptions): string;
    dismiss(id: string): void;
    dismissAll(): void;
}

export interface ToastContextValue {
    toasts: ToastItem[];
    toast: ToastApi;
}

const noopApi: ToastApi = {
    success: () => '',
    error: () => '',
    info: () => '',
    dismiss: () => {},
    dismissAll: () => {},
};

export const ToastContext = createContext<ToastContextValue>({
    toasts: [],
    toast: noopApi,
});
