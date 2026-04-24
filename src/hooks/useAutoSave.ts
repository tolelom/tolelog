import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS, AUTO_SAVE_DELAY_MS } from '../utils/constants';
import { notify } from '../utils/notify';
import type { PostFormData, DraftData } from '../types';

export type SaveStatus = 'saved' | 'saving' | 'error';

export interface ServerSaveOptions {
    enabled: boolean;
    delay?: number;
    onSave: (data: PostFormData) => Promise<void>;
}

export interface UseAutoSaveReturn {
    saveStatus: SaveStatus;
    loadDraft: () => DraftData | null;
    clearDraft: () => void;
    hasDraft: () => boolean;
    getFormattedSaveTime: () => string;
}

export function useAutoSave(
    formData: PostFormData,
    storageKey: string = STORAGE_KEYS.DRAFT,
    serverSave?: ServerSaveOptions
): UseAutoSaveReturn {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const serverSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef<DraftData | null>(null);
    const hasNotifiedFailureRef = useRef(false);

    const saveDraft = useCallback((data: PostFormData) => {
        try {
            const draftData: DraftData = {
                title: data.title,
                content: data.content,
                is_public: data.is_public,
                tags: data.tags || '',
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(storageKey, JSON.stringify(draftData));
            lastSavedRef.current = draftData;
            setSaveStatus('saved');
        } catch (error) {
            console.error('저장 실패:', error);
            setSaveStatus('error');
        }
    }, [storageKey]);

    // localStorage auto-save
    useEffect(() => {
        setSaveStatus('saving');

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveDraft(formData);
        }, AUTO_SAVE_DELAY_MS);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [formData, saveDraft]);

    // server save side effect
    useEffect(() => {
        if (!serverSave?.enabled) return;

        if (serverSaveTimeoutRef.current) {
            clearTimeout(serverSaveTimeoutRef.current);
        }

        serverSaveTimeoutRef.current = setTimeout(async () => {
            try {
                await serverSave.onSave(formData);
                hasNotifiedFailureRef.current = false;
            } catch {
                if (!hasNotifiedFailureRef.current) {
                    notify.error('자동 저장 실패. 네트워크를 확인해주세요.');
                    hasNotifiedFailureRef.current = true;
                }
            }
        }, serverSave.delay ?? 5000);

        return () => {
            if (serverSaveTimeoutRef.current) {
                clearTimeout(serverSaveTimeoutRef.current);
            }
        };
    }, [formData, serverSave?.enabled, serverSave?.delay, serverSave?.onSave]);

    const loadDraft = useCallback((): DraftData | null => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                return JSON.parse(saved) as DraftData;
            }
            return null;
        } catch (error) {
            console.error('백업 로드 실패:', error);
            return null;
        }
    }, [storageKey]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
            lastSavedRef.current = null;
            setSaveStatus('saved');
        } catch (error) {
            console.error('백업 초기화 실패:', error);
        }
    }, [storageKey]);

    const hasDraft = useCallback((): boolean => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved !== null;
        } catch {
            return false;
        }
    }, [storageKey]);

    const getFormattedSaveTime = (): string => {
        const draft = loadDraft();
        if (!draft || !draft.savedAt) return '';

        const date = new Date(draft.savedAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) {
            return '방금 전';
        } else if (diffMins < 60) {
            return `${diffMins}분 전`;
        } else {
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) {
                return `${diffHours}시간 전`;
            } else {
                return `${Math.floor(diffHours / 24)}일 전`;
            }
        }
    };

    return {
        saveStatus,
        loadDraft,
        clearDraft,
        hasDraft,
        getFormattedSaveTime,
    };
}
