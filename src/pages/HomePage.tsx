import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, MouseEvent } from 'react';
import { POST_API, SERIES_API, TAG_API, USER_API } from '../utils/api';
import { stripMarkdown, formatDate } from '../utils/format';
import { BLOG_OWNER_ID, API_BASE_URL } from '../utils/constants';
import { cachedFetch } from '../utils/apiCache';
import { PostListItem, Pagination, PostListWithPagination, Series, User, TagInfo } from '../types';
import './HomePage.css';

const PAGE_SIZE = 10;

export default function HomePage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const page: number = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const tag: string = searchParams.get('tag') || '';
    const searchQuery: string = searchParams.get('q') || '';
    const [searchInput, setSearchInput] = useState(searchQuery);
    const [posts, setPosts] = useState<PostListItem[]>([]);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [fetchKey, setFetchKey] = useState<number>(0);
    const [seriesList, setSeriesList] = useState<Series[]>([]);
    const [ownerProfile, setOwnerProfile] = useState<User | null>(null);
    const [popularTags, setPopularTags] = useState<TagInfo[]>([]);

    useEffect(() => { document.title = 'Tolelog'; }, []);

    // 시리즈 목록 로드 (첫 페이지, 검색/태그 없을 때만)
    useEffect(() => {
        if (page !== 1 || tag || searchQuery) { setSeriesList([]); return; }
        const controller = new AbortController();
        SERIES_API.getUserSeries(BLOG_OWNER_ID, { signal: controller.signal })
            .then(res => { if (res.status === 'success') setSeriesList(res.data || []); })
            .catch(() => {});
        return () => controller.abort();
    }, [page, tag, searchQuery]);

    // 블로그 소유자 프로필 로드
    useEffect(() => {
        const controller = new AbortController();
        USER_API.getProfile(BLOG_OWNER_ID, { signal: controller.signal })
            .then(res => { if (res.status === 'success') setOwnerProfile(res.data); })
            .catch(() => {});
        return () => controller.abort();
    }, []);

    // 인기 태그 로드
    useEffect(() => {
        const controller = new AbortController();
        TAG_API.getTags({ signal: controller.signal })
            .then(res => { if (res.status === 'success') setPopularTags((res.data || []).slice(0, 15)); })
            .catch(() => {});
        return () => controller.abort();
    }, []);

    // Debounce search input into URL params
    useEffect(() => {
        const timer = setTimeout(() => {
            const currentQ = searchParams.get('q') || '';
            if (searchInput.trim() !== currentQ) {
                setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    if (searchInput.trim()) {
                        next.set('q', searchInput.trim());
                    } else {
                        next.delete('q');
                    }
                    next.delete('page');
                    return next;
                });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Sync searchInput when URL q param changes externally
    useEffect(() => {
        setSearchInput(searchParams.get('q') || '');
    }, [searchParams.get('q')]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        const q = searchParams.get('q') || '';
        const cacheKey = q ? `search:${q}:${page}` : `posts:${page}:${tag}`;
        const fetchPromise = cachedFetch(cacheKey, () =>
            q
                ? POST_API.searchPosts(q, page, PAGE_SIZE, { signal: controller.signal })
                : POST_API.getPublicPosts(page, PAGE_SIZE, { signal: controller.signal, tag })
        );

        fetchPromise
            .then((res) => {
                const data = res.data;
                const list: PostListItem[] = Array.isArray(data) ? data : data.posts || [];
                const pagination: Pagination | undefined = (data as PostListWithPagination).pagination;
                setPosts(list);
                if (pagination) {
                    setTotalPages(pagination.total_pages || 0);
                    setHasMore(page < pagination.total_pages);
                } else {
                    setHasMore(list.length === PAGE_SIZE);
                }
                window.scrollTo(0, 0);
            })
            .catch((err: Error) => {
                if (err.name === 'AbortError') return;
                setError(err.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [page, tag, searchQuery, fetchKey]);

    return (
        <div className="home-page">
            {/* 미니 프로필 */}
            {ownerProfile && (
                <div className="home-profile">
                    {ownerProfile.avatar_url ? (
                        <img
                            src={ownerProfile.avatar_url.startsWith('http') ? ownerProfile.avatar_url : `${API_BASE_URL}${ownerProfile.avatar_url}`}
                            alt={ownerProfile.username}
                            className="home-profile-avatar"
                        />
                    ) : (
                        <div className="home-profile-avatar-fallback">
                            {ownerProfile.username.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="home-profile-info">
                        <Link to={`/user/${ownerProfile.id}`} className="home-profile-name">
                            {ownerProfile.username}
                        </Link>
                        <div className="home-profile-stats">
                            {seriesList.length > 0 && (
                                <span>시리즈 <span className="home-profile-stat-value">{seriesList.length}</span></span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 인기 태그 */}
            {popularTags.length > 0 && !tag && !searchQuery && (
                <div className="home-popular-tags">
                    <h2 className="home-popular-tags-heading">인기 태그</h2>
                    <div className="home-popular-tags-list">
                        {popularTags.map(t => (
                            <button
                                key={t.name}
                                type="button"
                                className="home-popular-tag"
                                onClick={() => setSearchParams({ tag: t.name })}
                            >
                                {t.name} <span className="home-popular-tag-count">{t.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="home-search">
                <input
                    type="text"
                    className="home-search-input"
                    placeholder="글 검색..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                    <button className="home-search-clear" onClick={() => { setSearchInput(''); setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('q'); next.delete('page'); return next; }); }} aria-label="검색어 지우기">×</button>
                )}
            </div>

            {/* 시리즈 섹션 */}
            {seriesList.length > 0 && (
                <div className="home-series-section">
                    <h2 className="home-series-heading">시리즈</h2>
                    <div className="home-series-list">
                        {seriesList.map(s => (
                            <Link key={s.id} to={`/series/${s.id}`} className="home-series-card">
                                <span className="home-series-title">{s.title}</span>
                                <span className="home-series-count">{s.post_count}편</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="home-post-list">
                {loading && (
                    <div className="home-skeleton-list">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="skeleton-card">
                                <div className="skeleton skeleton-text-lg" style={{ width: '70%' }} />
                                <div className="skeleton-meta-row">
                                    <div className="skeleton skeleton-text-sm" style={{ width: 60 }} />
                                    <div className="skeleton skeleton-text-sm" style={{ width: 80 }} />
                                </div>
                                <div className="skeleton skeleton-text" style={{ width: '100%' }} />
                                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="home-status home-error">
                        <p>오류가 발생했습니다: {error}</p>
                        <button className="home-retry-btn" onClick={() => setFetchKey((k: number) => k + 1)}>
                            다시 시도
                        </button>
                    </div>
                )}

                {!loading && !error && posts.length === 0 && (
                    <div className="home-status">
                        <p>{searchQuery ? `'${searchQuery}' 검색 결과가 없습니다.` : tag ? `'${tag}' 태그가 포함된 글이 없습니다.` : '아직 작성된 글이 없습니다.'}</p>
                    </div>
                )}

                {searchQuery && (
                    <div className="home-tag-filter">
                        <span>검색: <strong>{searchQuery}</strong></span>
                        <button className="home-tag-clear" onClick={() => { setSearchInput(''); setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('q'); next.delete('page'); return next; }); }}>×</button>
                    </div>
                )}

                {tag && (
                    <div className="home-tag-filter">
                        <span>태그: <strong>{tag}</strong></span>
                        <button className="home-tag-clear" onClick={() => setSearchParams({})}>×</button>
                    </div>
                )}

                {!loading && !error && posts.map((post: PostListItem) => (
                    <Link
                        key={post.id}
                        to={`/post/${post.id}`}
                        className="home-post-card"
                    >
                        <h2 className="home-post-title">{post.title}</h2>
                        <div className="home-post-meta">
                            <span
                                className="home-post-author"
                                role="link"
                                tabIndex={0}
                                onClick={(e: MouseEvent<HTMLSpanElement>) => { e.preventDefault(); e.stopPropagation(); navigate(`/user/${post.user_id}`); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); navigate(`/user/${post.user_id}`); } }}
                            >
                                {post.author}
                            </span>
                            <span className="home-post-sep">&middot;</span>
                            <span className="home-post-date">{formatDate(post.created_at)}</span>
                            {post.view_count > 0 && (
                                <>
                                    <span className="home-post-sep">&middot;</span>
                                    <span className="home-post-views">조회 {post.view_count}</span>
                                </>
                            )}
                        </div>
                        {post.series && (
                            <div className="home-post-series-badge">
                                {post.series.series_title}
                            </div>
                        )}
                        {post.tags && (
                            <div className="home-post-tags">
                                {post.tags.split(',').map((t: string) => {
                                    const trimmed = t.trim();
                                    return trimmed ? (
                                        <button
                                            key={trimmed}
                                            type="button"
                                            className={`tag-chip tag-chip-btn${tag === trimmed ? ' tag-chip-active' : ''}`}
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSearchParams(tag === trimmed ? {} : { tag: trimmed }); }}
                                        >
                                            {trimmed}
                                        </button>
                                    ) : null;
                                })}
                            </div>
                        )}
                        {'content' in post && (post as PostListItem & { content?: string }).content && (
                            <p className="home-post-preview">
                                {stripMarkdown((post as PostListItem & { content?: string }).content!).slice(0, 150)}
                            </p>
                        )}
                    </Link>
                ))}

                {!loading && !error && (posts.length > 0 || page > 1) && (
                    <nav className="pagination home-pagination" aria-label="페이지 탐색">
                        <button
                            className="page-btn"
                            disabled={page <= 1}
                            onClick={() => {
                                const params: Record<string, string> = {};
                                if (tag) params.tag = tag;
                                if (searchQuery) params.q = searchQuery;
                                if (page - 1 > 1) params.page = String(page - 1);
                                setSearchParams(params);
                            }}
                        >
                            &larr; 이전
                        </button>
                        <span className="page-info">
                            {totalPages > 0 ? `${page} / ${totalPages}` : page}
                        </span>
                        <button
                            className="page-btn"
                            disabled={!hasMore}
                            onClick={() => {
                                const params: Record<string, string> = { page: String(page + 1) };
                                if (tag) params.tag = tag;
                                if (searchQuery) params.q = searchQuery;
                                setSearchParams(params);
                            }}
                        >
                            다음 &rarr;
                        </button>
                    </nav>
                )}
            </div>
        </div>
    );
}
