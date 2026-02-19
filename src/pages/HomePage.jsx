import { Link } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext.js';
import { POST_API } from '../utils/api.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import './HomePage.css';

const PAGE_SIZE = 10;

function stripMarkdown(text) {
    return text
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
        .replace(/#{1,6}\s/g, '')
        .replace(/[*_~`>]/g, '')
        .replace(/\n+/g, ' ')
        .trim();
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

export default function HomePage() {
    const { username, logout } = useContext(AuthContext);
    const [posts, setPosts] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fetchKey, setFetchKey] = useState(0);

    useEffect(() => { document.title = 'Tolelog'; }, []);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        POST_API.getPublicPosts(page, PAGE_SIZE, { signal: controller.signal })
            .then((res) => {
                const data = res.data || res;
                const list = Array.isArray(data) ? data : data.posts || [];
                setPosts(list);
                setHasMore(list.length === PAGE_SIZE);
                window.scrollTo(0, 0);
            })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                setError(err.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [page, fetchKey]);

    return (
        <div className="home-page">
            <div className="home-header">
                <h1 className="home-title">tolelog</h1>
                <ThemeToggle />
            </div>

            <div className="home-actions">
                {username ? (
                    <>
                        <span className="home-user">{username}님</span>
                        <span className="home-sep">&middot;</span>
                        <Link to="/editor_private" className="home-nav-link">글쓰기</Link>
                        <span className="home-sep">&middot;</span>
                        <button className="home-nav-link home-logout-btn" onClick={logout}>로그아웃</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="home-nav-link">로그인</Link>
                        <span className="home-sep">&middot;</span>
                        <Link to="/register" className="home-nav-link">회원가입</Link>
                    </>
                )}
            </div>

            <div className="home-post-list">
                {loading && (
                    <div className="home-status">
                        <div className="home-spinner" />
                        <p>글을 불러오는 중...</p>
                    </div>
                )}

                {error && (
                    <div className="home-status home-error">
                        <p>오류가 발생했습니다: {error}</p>
                        <button className="home-retry-btn" onClick={() => setFetchKey(k => k + 1)}>
                            다시 시도
                        </button>
                    </div>
                )}

                {!loading && !error && posts.length === 0 && (
                    <div className="home-status">
                        <p>아직 작성된 글이 없습니다.</p>
                    </div>
                )}

                {!loading && !error && posts.map((post) => (
                    <Link
                        key={post.id}
                        to={`/post/${post.id}`}
                        className="home-post-card"
                    >
                        <h2 className="home-post-title">{post.title}</h2>
                        <div className="home-post-meta">
                            <span className="home-post-author">{post.author}</span>
                            <span className="home-post-sep">&middot;</span>
                            <span className="home-post-date">{formatDate(post.created_at)}</span>
                        </div>
                        {post.tags && (
                            <div className="home-post-tags">
                                {post.tags.split(',').map((tag, i) => {
                                    const trimmed = tag.trim();
                                    return trimmed ? <span key={i} className="tag-chip">{trimmed}</span> : null;
                                })}
                            </div>
                        )}
                        {post.content && (
                            <p className="home-post-preview">
                                {stripMarkdown(post.content).slice(0, 150)}
                            </p>
                        )}
                    </Link>
                ))}

                {!loading && !error && (posts.length > 0 || page > 1) && (
                    <div className="home-pagination">
                        <button
                            className="home-page-btn"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                        >
                            &larr; 이전
                        </button>
                        <span className="home-page-num">{page}</span>
                        <button
                            className="home-page-btn"
                            disabled={!hasMore}
                            onClick={() => setPage(page + 1)}
                        >
                            다음 &rarr;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
