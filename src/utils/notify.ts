import type { ToastApi, ToastOptions } from '../context/ToastContext';

let api: ToastApi | null = null;

function warnMissing(): '' {
    console.warn('[notify] ToastProvider not mounted');
    return '';
}

export const notify = {
    success(message: string, options?: ToastOptions): string {
        return api ? api.success(message, options) : warnMissing();
    },
    error(message: string, options?: ToastOptions): string {
        return api ? api.error(message, options) : warnMissing();
    },
    info(message: string, options?: ToastOptions): string {
        return api ? api.info(message, options) : warnMissing();
    },
    dismiss(id: string): void {
        if (api) api.dismiss(id);
        else warnMissing();
    },
    dismissAll(): void {
        if (api) api.dismissAll();
        else warnMissing();
    },
    _register(next: ToastApi): void {
        api = next;
    },
    _unregister(): void {
        api = null;
    },
};
