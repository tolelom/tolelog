import { useEffect, useRef } from 'react';
import { renderMarkdown } from '../utils/markdown';
import { useCopyCodeBlock } from '../hooks/useCopyCodeBlock';

interface PreviewModalProps {
    title: string;
    content: string;
    tags: string;
    onClose: () => void;
}

export default function PreviewModal({ title, content, tags, onClose }: PreviewModalProps) {
    const contentRef = useRef<HTMLDivElement | null>(null);

    // Escape 닫기
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // 스크롤 잠금
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // 코드 복사 버튼
    useCopyCodeBlock(contentRef);

    return (
        <div className="preview-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="미리보기">
            <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="preview-header">
                    <h2 className="preview-title">{title || '제목 없음'}</h2>
                    <button className="preview-close" onClick={onClose} aria-label="미리보기 닫기">
                        &times;
                    </button>
                </div>
                {tags && (
                    <div className="preview-tags">
                        {tags.split(',').map((tag: string, i: number) => {
                            const trimmed = tag.trim();
                            return trimmed ? <span key={i} className="tag-chip">{trimmed}</span> : null;
                        })}
                    </div>
                )}
                <div
                    ref={contentRef}
                    className="preview-body markdown-content md-body"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
            </div>
        </div>
    );
}
