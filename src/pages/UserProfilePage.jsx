import { useState, useEffect, useContext } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { USER_API, POST_API } from '../utils/api';
import { stripMarkdown, formatDate } from '../utils/format.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import './UserProfilePage.css';

const PAGE_SIZE = 10;

export default function UserProfilePage() {
    const { userId } = useParams();
    const { userId: currentUserId } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const tag = searchParams.get('tag') || '';
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isOwnProfile = currentUserId && String(currentUserId) === String(userId);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        Promise.all([
            USER_API.getProfile(userId, { signal: controller.signal }),
            POST_API.getUserPosts(userId, page, PAGE_SIZE, { signal: controller.signal, tag }),
        ])
            .then(([profileRes, postsRes]) => {
                if (profileRes.status === 'success') {
                    setProfile(profileRes.data);
                    document.title = `${profileRes.data.username} | Tolelog`;
                }

                const data = postsRes.data || postsRes;
                const list = Array.isArray(data) ? data : data.posts || [];
                setPosts(list);
                setHasMore(list.length === PAGE_SIZE);
            })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                setError(err.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [userId, page, tag]);

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-status">
                    <div className="profile-spinner" />
                    <p>프로필을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-page">
                <div className="profile-status profile-error">
                    <p>오류가 발생했습니다: {error}</p>
                    <Link to="/" className="profile-back-link">홈으로 돌아가기</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="profile-header">
                <Link to="/" className="profile-back-link">&larr; 홈</Link>
                <ThemeToggle />
            </div>

            {profile && (
                <div className="profile-info">
                    <div className="profile-avatar">
                        {profile.username.charAt(0).toUpperCase()}
                    </div>
                    <h1 className="profile-username">{profile.username}</h1>
                    <p className="profile-join-date">
                        가입일: {formatDate(profile.created_at)}
                    </p>
                </div>
            )}

            <div className="profile-posts-section">
                <h2 className="profile-posts-title">
                    {isOwnProfile ? '내 글' : `${profile?.username || ''}의 글`}
                </h2>

                {tag && (
                    <div className="profile-tag-filter">
                        <span>태그: <strong>{tag}</strong></span>
                        <button className="profile-tag-clear" onClick={() => setSearchParams({})}>×</button>
                    </div>
                )}

                {posts.length === 0 && (
                    <div className="profile-status">
                        <p>아직 작성된 글이 없습니다.</p>
                    </div>
                )}

                {posts.map((post) => (
                    <Link
                        key={post.id}
                        to={`/post/${post.id}`}
                        className="profile-post-card"
                    >
                        <h3 className="profile-post-title">{post.title}</h3>
                        <div className="profile-post-meta">
                            <span className="profile-post-date">{formatDate(post.created_at)}</span>
                            {post.tags && post.tags.split(',').map((t, i) => {
                                const trimmed = t.trim();
                                return trimmed ? (
                                    <span
                                        key={i}
                                        className={`tag-chip tag-chip-btn${tag === trimmed ? ' tag-chip-active' : ''}`}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSearchParams(tag === trimmed ? {} : { tag: trimmed }); }}
                                    >
                                        {trimmed}
                                    </span>
                                ) : null;
                            })}
                            {!post.is_public && (
                                <span className="profile-post-private">비공개</span>
                            )}
                        </div>
                        {post.content && (
                            <p className="profile-post-preview">
                                {stripMarkdown(post.content).slice(0, 150)}
                            </p>
                        )}
                    </Link>
                ))}

                {(posts.length > 0 || page > 1) && (
                    <div className="profile-pagination">
                        <button
                            className="profile-page-btn"
                            disabled={page <= 1}
                            onClick={() => {
                                const params = {};
                                if (tag) params.tag = tag;
                                if (page - 1 > 1) params.page = page - 1;
                                setSearchParams(params);
                            }}
                        >
                            &larr; 이전
                        </button>
                        <span className="profile-page-num">{page}</span>
                        <button
                            className="profile-page-btn"
                            disabled={!hasMore}
                            onClick={() => {
                                const params = { page: page + 1 };
                                if (tag) params.tag = tag;
                                setSearchParams(params);
                            }}
                        >
                            다음 &rarr;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
