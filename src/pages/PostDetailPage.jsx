import { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { POST_API } from '../utils/api';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import './PostDetailPage.css';

export default function PostDetailPage() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { user, token } = useContext(AuthContext);
    const [post, setPost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // marked 설정
    useEffect(() => {
        marked.setOptions({
            breaks: true,
            gfm: true,
            pedantic: false,
        });

        marked.use({
            async: false,
            pedantic: false,
            gfm: true,
            breaks: true,
            renderer: {
                code(code, language) {
                    const validLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
                    const highlighted = hljs.highlight(code, { language: validLanguage, ignoreIllegals: true }).value;
                    return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
                },
                codespan(code) {
                    return `<code class="inline-code">${code}</code>`;
                },
                link(href, title, text) {
                    return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
                },
                image(href, title, text) {
                    return `<img src="${href}" alt="${text}" title="${title || ''}" style="max-width: 100%; height: auto;" />`;
                },
                table(header, body) {
                    return `<table class="markdown-table"><thead>${header}</thead><tbody>${body}</tbody></table>`;
                },
                blockquote(quote) {
                    return `<blockquote class="markdown-blockquote">${quote}</blockquote>`;
                },
                list(body, ordered) {
                    const tag = ordered ? 'ol' : 'ul';
                    return `<${tag} class="markdown-list">${body}</${tag}>`;
                },
                heading(text, level) {
                    return `<h${level} class="markdown-heading">${text}</h${level}>`;
                },
                paragraph(text) {
                    return `<p class="markdown-paragraph">${text}</p>`;
                }
            }
        });
    }, []);

    // 글 로드
    useEffect(() => {
        const loadPost = async () => {
            try {
                setIsLoading(true);
                const response = await POST_API.getPost(postId);
                if (response.status === 'success') {
                    setPost(response.data);
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

    const handleDelete = async () => {
        if (!window.confirm('정말 이 글을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const response = await POST_API.deletePost(postId, token);
            if (response.status === 'success') {
                alert('글이 삭제되었습니다.');
                navigate('/');
            } else {
                alert('글 삭제에 실패했습니다.');
            }
        } catch (err) {
            alert(err.message || '글 삭제에 실패했습니다.');
        }
    };

    const renderMarkdown = (text) => {
        if (!text) return '';
        try {
            return marked(text);
        } catch (err) {
            console.error('Markdown rendering error:', err);
            return '<p class="error-preview">마크다운 렌더링 오류</p>';
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

    // 본인 사용자가 중스일기
    const isOwner = user && user.id === post.user_id;
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
                        <span className="author">{post.author}</span>
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

                {/* 글 내용 */}
                <div
                    className="post-content markdown-content"
                    dangerouslySetInnerHTML={{
                        __html: renderMarkdown(post.content)
                    }}
                />

                {/* 단추기 */}
                {isOwner && (
                    <div className="post-actions">
                        <Link to={`/editor/${postId}`} className="btn-edit">
                            수정
                        </Link>
                        <button className="btn-delete" onClick={handleDelete}>
                            삭제
                        </button>
                    </div>
                )}

                {/* 낤만 검색 */}
                <Link to="/" className="back-link">글 목록으로 돌아가기</Link>
            </article>
        </div>
    );
}
