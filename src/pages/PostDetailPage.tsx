import { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API } from '../utils/api';
import { invalidateCache } from '../utils/apiCache';
import { renderMarkdown } from '../utils/markdown';
import { Post } from '../types';
import { useTOC, TocItem } from '../hooks/useTOC';
import { useSeriesNav } from '../hooks/useSeriesNav';
import { useLike } from '../hooks/useLike';
import CommentSection from '../components/CommentSection';
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
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
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
    const { seriesNav, seriesTocOpen, seriesDetail, toggleSeriesToc } = useSeriesNav(postId);
    const { liked, likeCount, likeLoading, handleLike } = useLike(postId, token, post?.like_count || 0);

    const renderedHtml = useMemo(() => ({ __html: post ? renderMarkdown(post.content) : '' }), [post]);

    // 코드 블록 복사 버튼 이벤트 위임
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;
        const handleClick = (e: Event) => {
            const btn = (e.target as HTMLElement).closest('.code-copy-btn') as HTMLElement | null;
            if (!btn) return;
            const code = btn.getAttribute('data-code')
                ?.replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
            if (code) {
                navigator.clipboard.writeText(code).then(() => {
                    btn.textContent = '복사됨!';
                    setTimeout(() => { btn.textContent = '복사'; }, 2000);
                }).catch(() => {
                    btn.textContent = '복사 실패';
                    setTimeout(() => { btn.textContent = '복사'; }, 2000);
                });
            }
        };
        container.addEventListener('click', handleClick);
        return () => container.removeEventListener('click', handleClick);
    }, [post]);

    // 글 로드
    useEffect(() => {
        const controller = new AbortController();
        const loadPost = async () => {
            try {
                setIsLoading(true);
                const response = await POST_API.getPost(postId!, { signal: controller.signal, token: token ?? undefined });
                if (response.status === 'success') {
                    setPost(response.data);
                    document.title = `${response.data.title} | Tolelog`;
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
    }, [postId, token]);

    // OG / SEO 메타 태그
    useEffect(() => {
        if (!post) return;
        const description = getPlainText(post.content);
        const ogImage = getFirstHttpImage(post.content);
        const created: HTMLMetaElement[] = [];
        const setMeta = (attr: string, attrValue: string, content: string | null) => {
            if (!content) return;
            let el = document.querySelector(`meta[${attr}="${attrValue}"]`) as HTMLMetaElement | null;
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, attrValue);
                document.head.appendChild(el);
                created.push(el);
            }
            el.setAttribute('content', content);
        };
        setMeta('name', 'description', description);
        setMeta('property', 'og:title', post.title);
        setMeta('property', 'og:description', description);
        setMeta('property', 'og:url', window.location.href);
        setMeta('property', 'og:type', 'article');
        if (ogImage) setMeta('property', 'og:image', ogImage);
        setMeta('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary');
        return () => { created.forEach(el => el.parentNode?.removeChild(el)); };
    }, [post]);

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
        if (!postId || !token) return;
        setIsDeleting(true);
        setDeleteError('');
        try {
            const response = await POST_API.deletePost(postId, token);
            if (response.status === 'success') {
                invalidateCache('posts:');
                invalidateCache('search:');
                navigate('/');
            } else {
                setDeleteError('글 삭제에 실패했습니다.');
                setDeleteConfirm(false);
            }
        } catch (err: unknown) {
            setDeleteError(err instanceof Error ? err.message : '글 삭제에 실패했습니다.');
            setDeleteConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="post-detail-page">
                <div className="loading-container"><div className="spinner"></div><p>글을 불러오는 중...</p></div>
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
    const createdAt = new Date(post.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const updatedAt = post.updated_at ? new Date(post.updated_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

    return (
        <div className="post-detail-page">
            {toc.length > 1 && (
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

                {toc.length > 1 && (
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
                                        <Link to={`/post/${p.id}`}><span className="series-toc-num">{i + 1}.</span> {p.title}</Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="series-nav-buttons">
                            {seriesNav.prev_post ? (
                                <Link to={`/post/${seriesNav.prev_post.id}`} className="series-nav-btn series-nav-prev">
                                    <span className="series-nav-arrow">&larr;</span><span className="series-nav-label">{seriesNav.prev_post.title}</span>
                                </Link>
                            ) : <div />}
                            {seriesNav.next_post ? (
                                <Link to={`/post/${seriesNav.next_post.id}`} className="series-nav-btn series-nav-next">
                                    <span className="series-nav-label">{seriesNav.next_post.title}</span><span className="series-nav-arrow">&rarr;</span>
                                </Link>
                            ) : <div />}
                        </div>
                    </nav>
                )}

                {isOwner && (
                    <div className="post-actions">
                        <Link to={`/editor/${postId}`} className="btn-edit">수정</Link>
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
