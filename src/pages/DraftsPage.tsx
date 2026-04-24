import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API } from '../utils/api';
import type { Post } from '../types';
import { formatDate } from '../utils/format';
import { useToast } from '../hooks/useToast';
import './DraftsPage.css';

export default function DraftsPage() {
    const { token } = useContext(AuthContext);
    const { toast } = useToast();
    const [drafts, setDrafts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fetchKey, setFetchKey] = useState(0);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        document.title = '내 초안 | Tolelog';
    }, []);

    const fetchDrafts = useCallback(() => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        POST_API.getDrafts(token)
            .then(res => setDrafts(res.data))
            .catch(err => setError(err instanceof Error ? err.message : '초안 목록을 불러오지 못했습니다'))
            .finally(() => setIsLoading(false));
    }, [token]);

    useEffect(() => {
        fetchDrafts();
    }, [fetchDrafts, fetchKey]);

    const handleDelete = useCallback((id: number) => {
        if (!token || !window.confirm('이 초안을 삭제하시겠습니까?')) return;
        setDeletingId(id);
        POST_API.deletePost(id, token)
            .then(() => {
                setDrafts(prev => prev.filter(d => d.id !== id));
                toast.success('초안이 삭제되었습니다');
            })
            .catch(() => toast.error('초안 삭제에 실패했습니다'))
            .finally(() => setDeletingId(null));
    }, [token, toast]);

    return (
        <div className="drafts-page">
            <h1 className="drafts-title">내 초안</h1>

            {isLoading && (
                <ul className="drafts-list" aria-busy="true" aria-label="불러오는 중">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <li key={i} className="drafts-item drafts-item-skeleton">
                            <div className="drafts-item-link">
                                <span className="skeleton skeleton-text skeleton-w-60p" />
                                <span className="skeleton skeleton-text-sm skeleton-w-80" />
                            </div>
                            <div className="skeleton skeleton-h-28 skeleton-w-60" />
                        </li>
                    ))}
                </ul>
            )}

            {error && (
                <div className="drafts-error">
                    <p>{error}</p>
                    <button className="btn btn-secondary drafts-error-retry" onClick={() => setFetchKey(k => k + 1)}>다시 시도</button>
                </div>
            )}

            {!isLoading && !error && drafts.length === 0 && (
                <div className="drafts-empty">
                    <p>저장된 초안이 없습니다.</p>
                    <Link to="/editor" className="btn btn-primary drafts-new-btn">새 글 쓰기</Link>
                </div>
            )}

            {!isLoading && drafts.length > 0 && (
                <ul className="drafts-list">
                    {drafts.map(draft => (
                        <li key={draft.id} className="drafts-item">
                            <Link to={`/editor/${draft.id}`} className="drafts-item-link">
                                <span className="drafts-item-title">{draft.title || '제목 없음'}</span>
                                <span className="drafts-item-date">{formatDate(draft.updated_at)}</span>
                            </Link>
                            <button
                                type="button"
                                className="btn drafts-item-delete"
                                onClick={() => handleDelete(draft.id)}
                                disabled={deletingId === draft.id}
                                aria-label="초안 삭제"
                            >
                                {deletingId === draft.id ? '삭제 중…' : '삭제'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
