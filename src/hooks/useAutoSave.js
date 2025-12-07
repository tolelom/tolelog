import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'tolelog_draft';
const SAVE_DELAY = 1000; // 1초

export function useAutoSave(formData) {
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
    const saveTimeoutRef = useRef(null);
    const lastSavedRef = useRef(null);

    // 자동 저장 함수
    const saveDraft = (data) => {
        try {
            const draftData = {
                title: data.title,
                content: data.content,
                is_public: data.is_public,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
            lastSavedRef.current = draftData;
            setSaveStatus('saved');
        } catch (error) {
            console.error('저장 실패:', error);
            setSaveStatus('error');
        }
    };

    // formData 변경 시 자동 저장 (디바운싱)
    useEffect(() => {
        setSaveStatus('saving');

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveDraft(formData);
        }, SAVE_DELAY);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [formData]);

    // 저장된 백업 로드
    const loadDraft = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
            return null;
        } catch (error) {
            console.error('백업 로드 실패:', error);
            return null;
        }
    };

    // 백업 초기화
    const clearDraft = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            lastSavedRef.current = null;
            setSaveStatus('saved');
        } catch (error) {
            console.error('백업 초기화 실패:', error);
        }
    };

    // 백업 존재 여부 확인
    const hasDraft = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved !== null;
        } catch (error) {
            return false;
        }
    };

    // 저장 시간 포맷팅
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
