import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS, AUTO_SAVE_DELAY_MS } from '../utils/constants';

export function useAutoSave(formData, storageKey = STORAGE_KEYS.DRAFT) {
    const [saveStatus, setSaveStatus] = useState('saved');
    const saveTimeoutRef = useRef(null);
    const lastSavedRef = useRef(null);

    const saveDraft = (data) => {
        try {
            const draftData = {
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
    };

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
    }, [formData]);

    const loadDraft = useCallback(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                return JSON.parse(saved);
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

    const hasDraft = useCallback(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved !== null;
        } catch {
            return false;
        }
    }, [storageKey]);

    const getFormattedSaveTime = () => {
        const draft = loadDraft();
        if (!draft || !draft.savedAt) return '';

        const date = new Date(draft.savedAt);
        const now = new Date();
        const diffMs = now - date;
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
