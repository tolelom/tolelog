import { useState, useContext, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API } from '../utils/api';
import { renderMarkdown } from '../utils/markdown';
import 'highlight.js/styles/atom-one-dark.css';
import './PostDetailPage.css';

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
        const loadPost = async () => {
            try {
                setIsLoading(true);
                const response = await POST_API.getPost(postId);
                if (response.status === 'success') {
                    setPost(response.data);
                    document.title = `${response.data.title} | Tolelog`;
                } else {
                    setError('글을 찾을 수 없습니다.');
                }
            } catch (err) {
                setError(err.message || '글 로드에 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        loadPost();
    }, [postId]);

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
            <article className="post-article">
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
                        {!deleteConfirm ? (
                            <button className="btn-delete" onClick={handleDeleteClick}>
                                삭제
                            </button>
                        ) : (
                            <div className="delete-confirm-inline">
                                <span className="delete-confirm-text">정말 삭제하시겠습니까?</span>
                                <button className="btn-delete-confirm" onClick={handleDelete} disabled={isDeleting}>
                                    {isDeleting ? '삭제 중...' : '삭제'}
                                </button>
                                <button className="btn-delete-cancel" onClick={handleDeleteCancel} disabled={isDeleting}>
                                    취소
                                </button>
                            </div>
                        )}
                        {deleteError && <span className="delete-error">{deleteError}</span>}
                    </div>
                )}

                {/* 목록으로 돌아가기 */}
                <Link to="/" className="back-link">글 목록으로 돌아가기</Link>
            </article>
        </div>
    );
}
