import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify } from '../notify';
import type { ToastApi } from '../../context/ToastContext';

function makeApi(): ToastApi {
    return {
        success: vi.fn(() => 'sid'),
        error: vi.fn(() => 'eid'),
        info: vi.fn(() => 'iid'),
        dismiss: vi.fn(),
        dismissAll: vi.fn(),
    };
}

describe('notify singleton', () => {
    beforeEach(() => {
        notify._unregister();
        vi.restoreAllMocks();
    });

    it('warns and returns empty string when no provider registered', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const id = notify.error('boom');
        expect(id).toBe('');
        expect(warn).toHaveBeenCalledWith('[notify] ToastProvider not mounted');
    });

    it('dispatches to registered api for success/error/info', () => {
        const api = makeApi();
        notify._register(api);
        expect(notify.success('ok')).toBe('sid');
        expect(notify.error('bad')).toBe('eid');
        expect(notify.info('hi')).toBe('iid');
        expect(api.success).toHaveBeenCalledWith('ok', undefined);
        expect(api.error).toHaveBeenCalledWith('bad', undefined);
        expect(api.info).toHaveBeenCalledWith('hi', undefined);
    });

    it('forwards options', () => {
        const api = makeApi();
        notify._register(api);
        notify.success('ok', { duration: 1000 });
        expect(api.success).toHaveBeenCalledWith('ok', { duration: 1000 });
    });

    it('dismiss and dismissAll route to registered api', () => {
        const api = makeApi();
        notify._register(api);
        notify.dismiss('abc');
        notify.dismissAll();
        expect(api.dismiss).toHaveBeenCalledWith('abc');
        expect(api.dismissAll).toHaveBeenCalled();
    });

    it('unregister disables dispatch', () => {
        const api = makeApi();
        notify._register(api);
        notify._unregister();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        notify.info('hi');
        expect(api.info).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalled();
    });
});
