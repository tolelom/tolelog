import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SERIES_API } from '../utils/api';
import { formatDateShort } from '../utils/format';
import { SeriesDetail } from '../types';
import './SeriesDetailPage.css';

export default function SeriesDetailPage() {
    const { seriesId } = useParams<{ seriesId: string }>();
    const { userId, token } = useContext(AuthContext);
    const [series, setSeries] = useState<SeriesDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');

    const isOwnSeries = !!(series && userId && series.user_id === userId);

    const loadSeries = useCallback(async (signal?: AbortSignal) => {
        if (!seriesId) return;
        try {
            setIsLoading(true);
            const response = await SERIES_API.getSeries(seriesId, { signal });
            if (response.status === 'success') {
                setSeries(response.data);
                document.title = `${response.data.title} | Tolelog`;
            } else {
                setError('시리즈를 찾을 수 없습니다.');
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setError(err instanceof Error ? err.message : '시리즈 로드에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [seriesId]);

    useEffect(() => {
        const controller = new AbortController();
        loadSeries(controller.signal);
        return () => controller.abort();
    }, [loadSeries]);

    const handleRemovePost = async (postId: number) => {
        if (!seriesId || !token) return;
        setActionError('');
        try {
            await SERIES_API.removePost(seriesId, postId, token);
            await loadSeries();
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : '글 제거에 실패했습니다.');
        }
    };

    const handleMovePost = async (index: number, direction: 'up' | 'down') => {
        if (!series || !seriesId || !token) return;
        const posts = [...series.posts];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= posts.length) return;

        // Swap
        [posts[index], posts[targetIndex]] = [posts[targetIndex], posts[index]];
        const postIds = posts.map(p => p.id);

        // Optimistic update
        setSeries(prev => prev ? { ...prev, posts } : prev);
        setActionError('');

        try {
            await SERIES_API.reorderPosts(seriesId, postIds, token);
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : '순서 변경에 실패했습니다.');
            await loadSeries();
        }
    };

    if (isLoading) {
        return (
            <div className="series-detail-page">
                <div className="series-header">
                    <div className="skeleton skeleton-text-sm skeleton-w-100 skeleton-mb-16" />
                    <div className="skeleton skeleton-text-lg skeleton-w-60p skeleton-h-28" />
                    <div className="skeleton skeleton-text skeleton-w-80p skeleton-mt-12" />
                    <div className="skeleton-flex-row skeleton-mt-12">
                        <div className="skeleton skeleton-text-sm skeleton-w-60" />
                        <div className="skeleton skeleton-text-sm skeleton-w-50" />
                    </div>
                </div>
                <div className="series-post-list">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="series-post-item skeleton-no-pointer">
                            <div className="skeleton skeleton-circle skeleton-h-28 skeleton-shrink-0" />
                            <div className="skeleton-flex-col">
                                <div className="skeleton skeleton-text skeleton-w-70p" />
                                <div className="skeleton skeleton-text-sm skeleton-w-80" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !series) {
        return (
            <div className="series-detail-page">
                <div className="series-error">
                    <h2>오류</h2>
                    <p>{error || '시리즈를 찾을 수 없습니다.'}</p>
                    <Link to="/" className="back-link">홈으로 돌아가기</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="series-detail-page">
            <div className="series-header">
                <nav className="series-breadcrumb">
                    <Link to="/" className="breadcrumb-link">홈</Link>
                    <span className="breadcrumb-sep">/</span>
                    <span className="breadcrumb-current">시리즈</span>
                </nav>
                <h1 className="series-title">{series.title}</h1>
                {series.description && (
                    <p className="series-description">{series.description}</p>
                )}
                <div className="series-meta">
                    <Link to={`/user/${series.user_id}`} className="series-author">{series.author}</Link>
                    <span className="series-sep">·</span>
                    <span className="series-count">{series.posts.length}개의 글</span>
                </div>
            </div>

            {actionError && (
                <p className="series-action-error">{actionError}</p>
            )}

            <div className="series-post-list">
                {series.posts.map((post, index) => (
                    <div key={post.id} className="series-post-item">
                        <Link to={`/post/${post.id}`} className="series-post-item-link">
                            <span className="series-post-number">{index + 1}</span>
                            <div className="series-post-info">
                                <span className="series-post-title">{post.title}</span>
                                <span className="series-post-date">
                                    {formatDateShort(post.created_at)}
                                </span>
                            </div>
                        </Link>
                        {isOwnSeries && (
                            <div className="series-post-actions">
                                <button
                                    className="series-post-move-btn"
                                    disabled={index === 0}
                                    onClick={() => handleMovePost(index, 'up')}
                                    aria-label="위로 이동"
                                    title="위로 이동"
                                >
                                    &#9650;
                                </button>
                                <button
                                    className="series-post-move-btn"
                                    disabled={index === series.posts.length - 1}
                                    onClick={() => handleMovePost(index, 'down')}
                                    aria-label="아래로 이동"
                                    title="아래로 이동"
                                >
                                    &#9660;
                                </button>
                                <button
                                    className="series-post-remove-btn"
                                    onClick={() => handleRemovePost(post.id)}
                                    aria-label={`${post.title} 제거`}
                                    title="시리즈에서 제거"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
