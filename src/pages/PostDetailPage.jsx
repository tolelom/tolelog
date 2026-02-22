import { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API } from '../utils/api';
import { renderMarkdown } from '../utils/markdown';
import { slugifyHeading } from '../utils/markdownParser';
import 'highlight.js/styles/atom-one-dark.css';
import './PostDetailPage.css';

function getPlainText(content, maxLength = 160) {
    return content
        .replace(/!\[.*?\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/#{1,6}\s+/g, '')
        .replace(/[*_~`>]/g, '')
        .replace(/\n+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function getFirstHttpImage(content) {
    const match = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
    return match ? match[1] : null;
}

function extractToc(content) {
    const lines = content.split('\n');
    const toc = [];
    let inCode = false;
    for (const line of lines) {
        if (line.trimStart().startsWith('```')) { inCode = !inCode; continue; }
        if (inCode) continue;
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
            toc.push({
                level: match[1].length,
                text: match[2].replace(/[*_~`[\]()]/g, '').trim(),
                id: slugifyHeading(match[2]),
            });
        }
    }
    return toc;
}

export default function PostDetailPage() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { userId, token } = useContext(AuthContext);
    const [post, setPost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [activeTocId, setActiveTocId] = useState(null);
    const contentRef = useRef(null);

    // 코드 블록 복사 버튼 이벤트 위임
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;
        const handleClick = (e) => {
            const btn = e.target.closest('.code-copy-btn');
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
                const response = await POST_API.getPost(postId, { signal: controller.signal, token });
                if (response.status === 'success') {
                    setPost(response.data);
                    document.title = `${response.data.title} | Tolelog`;
                } else {
                    setError('글을 찾을 수 없습니다.');
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                setError(err.message || '글 로드에 실패했습니다.');
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
        const created = [];
        const setMeta = (attr, attrValue, content) => {
            if (!content) return;
            let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
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

    // 목차 추출 (early return 전에 호출해야 hooks 규칙 준수)
    const toc = useMemo(() => (post ? extractToc(post.content) : []), [post]);

    // TOC 현재 섹션 하이라이트
    useEffect(() => {
        if (toc.length === 0) return;
        const headingEls = toc.map(item => document.getElementById(item.id)).filter(Boolean);
        if (headingEls.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) setActiveTocId(entry.target.id);
                });
            },
            { rootMargin: '0px 0px -80% 0px', threshold: 0 }
        );
        headingEls.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, [toc]);

    useEffect(() => {
        if (!deleteConfirm) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setDeleteConfirm(false);
                setDeleteError('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteConfirm]);

    const handleDeleteClick = () => setDeleteConfirm(true);

    const handleDeleteCancel = () => {
        setDeleteConfirm(false);
        setDeleteError('');
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        setDeleteError('');
        try {
            const response = await POST_API.deletePost(postId, token);
            if (response.status === 'success') {
                navigate('/');
            } else {
                setDeleteError('글 삭제에 실패했습니다.');
                setDeleteConfirm(false);
            }
        } catch (err) {
            setDeleteError(err.message || '글 삭제에 실패했습니다.');
            setDeleteConfirm(false);
        } finally {
            setIsDeleting(false);
        }
    };

    // 로드 중
    if (isLoading) {
        return (
            <div className="post-detail-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>글을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    // 에러
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

    // 본인 글인지 확인
    const isOwner = userId && userId === post.user_id;
    const createdAt = new Date(post.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const updatedAt = post.updated_at ? new Date(post.updated_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }) : null;

    return (
        <div className="post-detail-page">
            {toc.length > 1 && (
                <nav className="toc-panel" aria-label="목차">
                    <p className="toc-title">목차</p>
                    <ul className="toc-list">
                        {toc.map((item, i) => (
                            <li key={i} className={`toc-item toc-level-${item.level}`}>
                                <a href={`#${item.id}`} className={`toc-link${activeTocId === item.id ? ' toc-link-active' : ''}`}>{item.text}</a>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
            <article className="post-article">
                {/* 브레드크럼 네비게이션 */}
                <nav className="post-breadcrumb">
                    <Link to="/" className="breadcrumb-link">홈</Link>
                    <span className="breadcrumb-sep">/</span>
                    <span className="breadcrumb-current">{post.title}</span>
                </nav>

                {/* 글 메타 */}
                <header className="post-header">
                    <h1 className="post-title">{post.title}</h1>
                    <div className="post-meta">
                        <span className="author" style={{ cursor: 'pointer' }} onClick={() => navigate(`/user/${post.user_id}`)}>{post.author}</span>
                        <span className="separator">•</span>
                        <span className="date">{createdAt}</span>
                        {updatedAt && createdAt !== updatedAt && (
                            <>
                                <span className="separator">•</span>
                                <span className="updated">수정: {updatedAt}</span>
                            </>
                        )}
                    </div>
                </header>

                {/* 태그 */}
                {post.tags && (
                    <div className="post-tags">
                        {post.tags.split(',').map((tag, i) => {
                            const trimmed = tag.trim();
                            return trimmed ? (
                                <span
                                    key={i}
                                    className="tag-chip tag-chip-btn"
                                    onClick={() => navigate(`/?tag=${encodeURIComponent(trimmed)}`)}
                                >
                                    {trimmed}
                                </span>
                            ) : null;
                        })}
                    </div>
                )}

                {/* 글 내용 */}
                <div
                    ref={contentRef}
                    className="post-content markdown-content"
                    dangerouslySetInnerHTML={{
                        __html: renderMarkdown(post.content)
                    }}
                />

                {/* 수정/삭제 버튼 */}
                {isOwner && (
                    <div className="post-actions">
                        <Link to={`/editor/${postId}`} className="btn-edit">
                            수정
                        </Link>
                        <button className="btn-delete" onClick={handleDeleteClick}>
                            삭제
                        </button>
                        {deleteError && <span className="delete-error">{deleteError}</span>}
                    </div>
                )}

                {/* 삭제 확인 모달 */}
                {deleteConfirm && (
                    <div className="delete-modal-overlay" onClick={handleDeleteCancel}>
                        <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                            <p className="delete-modal-text">이 글을 삭제하시겠습니까?</p>
                            <p className="delete-modal-sub">삭제된 글은 복구할 수 없습니다.</p>
                            <div className="delete-modal-actions">
                                <button className="btn-delete-cancel" onClick={handleDeleteCancel} disabled={isDeleting}>
                                    취소
                                </button>
                                <button className="btn-delete-confirm" onClick={handleDelete} disabled={isDeleting}>
                                    {isDeleting ? '삭제 중...' : '삭제'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </article>
        </div>
    );
}
