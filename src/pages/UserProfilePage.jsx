import { useState, useEffect, useContext } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { USER_API, POST_API } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle.jsx';
import './UserProfilePage.css';

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

export default function UserProfilePage() {
    const { userId } = useParams();
    const { userId: currentUserId } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
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
            POST_API.getUserPosts(userId, page, PAGE_SIZE, { signal: controller.signal }),
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
    }, [userId, page]);

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
                            onClick={() => setSearchParams(page - 1 <= 1 ? {} : { page: page - 1 })}
                        >
                            &larr; 이전
                        </button>
                        <span className="profile-page-num">{page}</span>
                        <button
                            className="profile-page-btn"
                            disabled={!hasMore}
                            onClick={() => setSearchParams({ page: page + 1 })}
                        >
                            다음 &rarr;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
