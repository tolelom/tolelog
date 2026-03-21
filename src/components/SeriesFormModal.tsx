import { useState, useEffect, useRef } from 'react';
import type { Series } from '../types';
import './SeriesFormModal.css';

interface SeriesFormModalProps {
    series?: Series | null;
    onSubmit: (title: string, description: string) => Promise<void>;
    onClose: () => void;
}

export default function SeriesFormModal({ series, onSubmit, onClose }: SeriesFormModalProps) {
    const isEdit = !!series;
    const [title, setTitle] = useState(series?.title || '');
    const [description, setDescription] = useState(series?.description || '');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    // Escape 닫기 + 포커스 트랩
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key === 'Tab' && modalRef.current) {
                const focusable = modalRef.current.querySelectorAll<HTMLElement>(
                    'input:not(:disabled), textarea:not(:disabled), button:not(:disabled)'
                );
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setError('시리즈 제목을 입력해주세요.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await onSubmit(trimmedTitle, description.trim());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="series-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={isEdit ? '시리즈 수정' : '새 시리즈 만들기'}>
            <div className="series-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                <h3 className="series-modal-title">
                    {isEdit ? '시리즈 수정' : '새 시리즈 만들기'}
                </h3>

                <div className="series-modal-field">
                    <label className="series-modal-label" htmlFor="series-title">제목</label>
                    <input
                        ref={titleRef}
                        id="series-title"
                        type="text"
                        className="series-modal-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="시리즈 제목"
                        maxLength={100}
                        disabled={isSubmitting}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    />
                </div>

                <div className="series-modal-field">
                    <label className="series-modal-label" htmlFor="series-description">설명</label>
                    <textarea
                        id="series-description"
                        className="series-modal-textarea"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="시리즈에 대한 간단한 설명 (선택)"
                        maxLength={500}
                        rows={3}
                        disabled={isSubmitting}
                    />
                </div>

                {error && <p className="series-modal-error">{error}</p>}

                <div className="series-modal-actions">
                    <button
                        className="series-modal-btn-cancel"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        취소
                    </button>
                    <button
                        className="series-modal-btn-submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim()}
                    >
                        {isSubmitting ? '저장 중...' : (isEdit ? '수정' : '만들기')}
                    </button>
                </div>
            </div>
        </div>
    );
}
