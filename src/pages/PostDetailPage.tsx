import { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { parsePostSlugId, postPath } from '../utils/slug';
import { AuthContext } from '../context/AuthContext';
import { POST_API } from '../utils/api';
import { invalidateCache } from '../utils/apiCache';
import { renderMarkdown } from '../utils/markdown';
import { formatDateLong } from '../utils/format';
import { Post } from '../types';
import { useTOC, TocItem } from '../hooks/useTOC';
import { useSeriesNav } from '../hooks/useSeriesNav';
import { useLike } from '../hooks/useLike';
import { useCopyCodeBlock } from '../hooks/useCopyCodeBlock';
import { useReturnFocus } from '../hooks/useReturnFocus';
import { useKatexReady } from '../hooks/useKatexReady';
import { useToast } from '../hooks/useToast';
import CommentSection from '../components/CommentSection';
import PageMeta from '../components/PageMeta';
import { ArticleJsonLd, BreadcrumbJsonLd } from '../components/StructuredData';
import 'highlight.js/styles/atom-one-dark.css';
import './PostDetailPage.css';

function getPlainText(content: string, maxLength: number = 160): string {
    return content
        .replace(/!\[.*?\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/#{1,6}\s+/g, '')
        .replace(/[*_~`>]/g, '')
        .replace(/\n+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function getFirstHttpImage(content: string): string | null {
    const match = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
    return match ? match[1] : null;
}

export default function PostDetailPage() {
    // URL 의 :postId 는 "123" 또는 "hello-world-123" 모두 가능. 트레일링 숫자에서 실제 ID 추출.
    const { postId: rawPostId } = useParams<{ postId: string }>();
    const parsed = useMemo(() => parsePostSlugId(rawPostId), [rawPostId]);
    const numericId = parsed ? String(parsed.id) : undefined;
    const navigate = useNavigate();
    const location = useLocation();
    const { userId, token } = useContext(AuthContext);
    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [deleteConfirm, setDeleteConfirm] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string>('');
    const contentRef = useRef<HTMLDivElement | null>(null);
    const deleteModalRef = useRef<HTMLDivElement | null>(null);

    const { toc, activeTocId, mobileTocOpen, setMobileTocOpen } = useTOC(post?.content ?? null);
    const { seriesNav, seriesTocOpen, seriesDetail, toggleSeriesToc } = useSeriesNav(numericId);
    const { liked, likeCount, likeLoading, handleLike } = useLike(numericId, token, post?.like_count || 0);
    const { toast } = useToast();

    // 삭제 확인 모달 닫을 때 트리거 버튼으로 포커스 복원 (a11y)
    useReturnFocus(deleteConfirm);

    // KaTeX 로드 완료 시 재렌더 트리거 (수식 콘텐츠를 정상 표시하기 위해)
    const katexVersion = useKatexReady();
    const renderedHtml = useMemo(
        () => ({ __html: post ? renderMarkdown(post.content) : '' }),
        // katexVersion이 바뀌면 renderMarkdown 결과(수식 부분)가 달라지므로 의도된 의존성
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [post, katexVersion],
    );

    // 코드 블록 복사 버튼 이벤트 위임
    useCopyCodeBlock(contentRef, !!post);

    // 글 로드
    useEffect(() => {
        if (!numericId) {
            setError('잘못된 게시글 주소입니다.');
            setIsLoading(false);
            return;
        }
        const controller = new AbortController();
        const loadPost = async () => {
            try {
                setIsLoading(true);
                const response = await POST_API.getPost(numericId, { signal: controller.signal, token: token ?? undefined });
                if (response.status === 'success') {
                    setPost(response.data);
                } else {
                    setError('글을 찾을 수 없습니다.');
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') return;
                setError(err instanceof Error ? err.message : '글 로드에 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        loadPost();
        return () => controller.abort();
    }, [numericId, token]);

    // canonical URL 로 자동 정규화: /post/123 또는 슬러그가 어긋난 URL 이면
    // canonical 슬러그 URL 로 history.replaceState 해서 주소창만 정리한다 (실제 네비게이션 없음).
    useEffect(() => {
        if (!post) return;
        const canonical = postPath({ id: post.id, title: post.title });
        if (location.pathname !== canonical) {
            navigate(canonical + location.search + location.hash, { replace: true });
        }
    }, [post, location.pathname, location.search, location.hash, navigate]);

    // 모달 배경 스크롤 잠금
    useEffect(() => {
        document.body.style.overflow = deleteConfirm ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [deleteConfirm]);

    // 삭제 모달 키보드 처리
    useEffect(() => {
        if (!deleteConfirm) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setDeleteConfirm(false); setDeleteError(''); return; }
            if (e.key === 'Tab' && deleteModalRef.current) {
                const focusable = deleteModalRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)');
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        requestAnimationFrame(() => {
            deleteModalRef.current?.querySelector<HTMLElement>('.btn-delete-cancel')?.focus();
        });
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteConfirm]);

    const handleDelete = async () => {
        if (!numericId || !token) return;
        setIsDeleting(true);
        setDeleteError('');
        try {
            const response = await POST_API.deletePost(numericId, token);
            if (response.status === 'success') {
                invalidateCache('posts:');
                invalidateCache('search:');
                toast.success('글을 삭제했습니다.');
                navigate('/');
            } else {
                const msg = '글 삭제에 실패했습니다.';
                setDeleteError(msg);
                toast.error(msg);
                setDeleteConfirm(false);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '글 삭제에 실패했습니다.';
            setDeleteError(msg);
            toast.error(msg);
            setDeleteConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="post-detail-page">
                <article className="post-article" aria-busy="true">
                    <div className="skeleton skeleton-text-lg skeleton-w-70p skeleton-mb-16" />
                    <div className="post-meta-skeleton">
                        <div className="skeleton skeleton-text-sm skeleton-w-80" />
                        <div className="skeleton skeleton-text-sm skeleton-w-60" />
                        <div className="skeleton skeleton-text-sm skeleton-w-50" />
                    </div>
                    <div className="post-content-skeleton">
                        <div className="skeleton skeleton-text skeleton-w-full" />
                        <div className="skeleton skeleton-text skeleton-w-90p" />
                        <div className="skeleton skeleton-text skeleton-w-full" />
                        <div className="skeleton skeleton-text skeleton-w-80p" />
                        <div className="skeleton skeleton-text skeleton-w-65p" />
                    </div>
                </article>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="post-detail-page">
                <div className="error-container">
                    <h2>오류</h2>
                    <p>{error || '글을 찾을 수 없습니다.'}</p>
                    <Link to="/" className="back-link">글 목록으로 돌아가기</Link>
                </div>
            </div>
        );
    }

    const isOwner = userId && userId === post.user_id;
    const createdAt = formatDateLong(post.created_at);
    const updatedAt = formatDateLong(post.updated_at);

    const metaDescription = getPlainText(post.content);
    const ogImage = getFirstHttpImage(post.content) ?? undefined;
    const tagList = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const postCanonical = postPath({ id: post.id, title: post.title });

    return (
        <div className="post-detail-page">
            <PageMeta
                title={post.title}
                description={metaDescription}
                canonical={postCanonical}
                ogImage={ogImage}
                ogType="article"
                noindex={!post.is_public}
                article={{
                    publishedTime: post.created_at,
                    modifiedTime: post.updated_at,
                    author: post.author,
                    tags: tagList,
                }}
            />
            {post.is_public && (
                <>
                    <ArticleJsonLd
                        url={postCanonical}
                        title={post.title}
                        description={metaDescription}
                        authorName={post.author}
                        datePublished={post.created_at}
                        dateModified={post.updated_at}
                        image={ogImage}
                        tags={tagList}
                    />
                    <BreadcrumbJsonLd
                        items={[
                            { name: '홈', url: '/' },
                            { name: post.title, url: postCanonical },
                        ]}
                    />
                </>
            )}
            {toc.length > 0 && (
                <nav className="toc-panel" aria-label="목차">
                    <p className="toc-title">목차</p>
                    <ul className="toc-list">
                        {toc.map((item: TocItem, i: number) => (
                            <li key={i} className={`toc-item toc-level-${item.level}`}>
                                <a href={`#${item.id}`} className={`toc-link${activeTocId === item.id ? ' toc-link-active' : ''}`}>{item.text}</a>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
            <article className="post-article">
                <nav className="post-breadcrumb">
                    <Link to="/" className="breadcrumb-link">홈</Link>
                    <span className="breadcrumb-sep">/</span>
                    <span className="breadcrumb-current">{post.title}</span>
                </nav>

                <header className="post-header">
                    <h1 className="post-title">{post.title}</h1>
                    <div className="post-meta">
                        <button type="button" className="author" onClick={() => navigate(`/user/${post.user_id}`)}>{post.author}</button>
                        <span className="separator">•</span>
                        <span className="date">{createdAt}</span>
                        {updatedAt && createdAt !== updatedAt && (<><span className="separator">•</span><span className="updated">수정: {updatedAt}</span></>)}
                        {post.view_count > 0 && (<><span className="separator">•</span><span className="views">조회 {post.view_count}</span></>)}
                    </div>
                </header>

                {post.tags && (
                    <div className="post-tags">
                        {post.tags.split(',').map((tag: string) => {
                            const trimmed = tag.trim();
                            return trimmed ? (
                                <button key={trimmed} type="button" className="tag-chip tag-chip-btn"
                                    onClick={() => navigate(`/?tag=${encodeURIComponent(trimmed)}`)}
                                >{trimmed}</button>
                            ) : null;
                        })}
                    </div>
                )}

                {toc.length > 0 && (
                    <div className="toc-mobile">
                        <button className="toc-mobile-toggle" onClick={() => setMobileTocOpen(v => !v)}>목차 {mobileTocOpen ? '▲' : '▼'}</button>
                        {mobileTocOpen && (
                            <ul className="toc-mobile-list">
                                {toc.map((item: TocItem, i: number) => (
                                    <li key={i} className={`toc-item toc-level-${item.level}`}>
                                        <a href={`#${item.id}`} className={`toc-link${activeTocId === item.id ? ' toc-link-active' : ''}`} onClick={() => setMobileTocOpen(false)}>{item.text}</a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <div ref={contentRef} className="post-content markdown-content md-body" dangerouslySetInnerHTML={renderedHtml} />

                <div className="post-like-section">
                    <button className={`post-like-btn${liked ? ' post-like-btn-active' : ''}`} onClick={handleLike} disabled={!token || likeLoading} title={token ? (liked ? '좋아요 취소' : '좋아요') : '로그인 후 이용 가능'}>
                        <span className="post-like-icon">{liked ? '♥' : '♡'}</span>
                        <span className="post-like-count">{likeCount}</span>
                    </button>
                </div>

                {seriesNav && (
                    <nav className="series-nav" aria-label="시리즈 네비게이션">
                        <div className="series-nav-header">
                            <Link to={`/series/${seriesNav.series_id}`} className="series-nav-title">{seriesNav.series_title}</Link>
                            <div className="series-nav-header-right">
                                <span className="series-nav-count">{seriesNav.current_order} / {seriesNav.total_posts}</span>
                                <button className="series-toc-toggle" onClick={toggleSeriesToc} aria-label={seriesTocOpen ? '목록 접기' : '목록 펼치기'}>{seriesTocOpen ? '▲' : '▼'}</button>
                            </div>
                        </div>
                        {seriesTocOpen && seriesDetail && (
                            <ul className="series-toc-list">
                                {seriesDetail.posts.map((p, i) => (
                                    <li key={p.id} className={p.id === post.id ? 'series-toc-current' : ''}>
                                        <Link to={postPath({ id: p.id, title: p.title })}><span className="series-toc-num">{i + 1}.</span> {p.title}</Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="series-nav-buttons">
                            {seriesNav.prev_post ? (
                                <Link to={postPath(seriesNav.prev_post)} className="series-nav-btn series-nav-prev">
                                    <span className="series-nav-arrow">&larr;</span><span className="series-nav-label">{seriesNav.prev_post.title}</span>
                                </Link>
                            ) : <div />}
                            {seriesNav.next_post ? (
                                <Link to={postPath(seriesNav.next_post)} className="series-nav-btn series-nav-next">
                                    <span className="series-nav-label">{seriesNav.next_post.title}</span><span className="series-nav-arrow">&rarr;</span>
                                </Link>
                            ) : <div />}
                        </div>
                    </nav>
                )}

                {isOwner && (
                    <div className="post-actions">
                        <Link to={`/editor/${post.id}`} className="btn-edit">수정</Link>
                        <button className="btn-delete" onClick={() => setDeleteConfirm(true)}>삭제</button>
                        {deleteError && <span className="delete-error">{deleteError}</span>}
                    </div>
                )}

                {post && <CommentSection postId={post.id} />}

                {deleteConfirm && (
                    <div className="delete-modal-overlay" onClick={() => { setDeleteConfirm(false); setDeleteError(''); }} role="dialog" aria-modal="true" aria-label="글 삭제 확인">
                        <div className="delete-modal" ref={deleteModalRef} onClick={(e) => e.stopPropagation()}>
                            <p className="delete-modal-text">이 글을 삭제하시겠습니까?</p>
                            <p className="delete-modal-sub">삭제된 글은 복구할 수 없습니다.</p>
                            <div className="delete-modal-actions">
                                <button className="btn-delete-cancel" onClick={() => { setDeleteConfirm(false); setDeleteError(''); }} disabled={isDeleting}>취소</button>
                                <button className="btn-delete-confirm" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? '삭제 중...' : '삭제'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </article>
        </div>
    );
}
