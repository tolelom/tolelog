import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SERIES_API } from '../utils/api';
import { SeriesDetail } from '../types';
import './SeriesDetailPage.css';

export default function SeriesDetailPage() {
    const { seriesId } = useParams<{ seriesId: string }>();
    const [series, setSeries] = useState<SeriesDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!seriesId) return;
        const controller = new AbortController();

        const loadSeries = async () => {
            try {
                setIsLoading(true);
                const response = await SERIES_API.getSeries(seriesId, { signal: controller.signal });
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
        };

        loadSeries();
        return () => controller.abort();
    }, [seriesId]);

    if (isLoading) {
        return (
            <div className="series-detail-page">
                <div className="series-header">
                    <div className="skeleton skeleton-text-sm" style={{ width: 100, marginBottom: 16 }} />
                    <div className="skeleton skeleton-text-lg" style={{ width: '60%', height: 28 }} />
                    <div className="skeleton skeleton-text" style={{ width: '80%', marginTop: 12 }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <div className="skeleton skeleton-text-sm" style={{ width: 60 }} />
                        <div className="skeleton skeleton-text-sm" style={{ width: 50 }} />
                    </div>
                </div>
                <div className="series-post-list">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="series-post-item" style={{ pointerEvents: 'none' }}>
                            <div className="skeleton skeleton-circle" style={{ width: 28, height: 28, flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                                <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                                <div className="skeleton skeleton-text-sm" style={{ width: 80 }} />
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

            <div className="series-post-list">
                {series.posts.map((post, index) => (
                    <Link
                        key={post.id}
                        to={`/post/${post.id}`}
                        className="series-post-item"
                    >
                        <span className="series-post-number">{index + 1}</span>
                        <div className="series-post-info">
                            <span className="series-post-title">{post.title}</span>
                            <span className="series-post-date">
                                {new Date(post.created_at).toLocaleDateString('ko-KR', {
                                    year: 'numeric', month: 'short', day: 'numeric'
                                })}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
