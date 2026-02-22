import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { USER_API, POST_API } from '../utils/api';
import { stripMarkdown, formatDate } from '../utils/format.js';
import { validateImageFile, compressImage } from '../utils/imageUpload.js';
import { API_BASE_URL } from '../utils/constants';
import ThemeToggle from '../components/ThemeToggle.jsx';
import './UserProfilePage.css';

const PAGE_SIZE = 10;

function getMemberDays(createdAt) {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return 0;
    return Math.max(1, Math.ceil((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function UserProfilePage() {
    const { userId } = useParams();
    const { userId: currentUserId, token, setAvatarUrl: setGlobalAvatarUrl } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const tag = searchParams.get('tag') || '';
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [totalPosts, setTotalPosts] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef(null);

    const isOwnProfile = currentUserId && String(currentUserId) === String(userId);

    // 현재 보이는 글에서 태그 집계
    const tagCloud = useMemo(() => {
        const counts = {};
        posts.forEach(post => {
            if (post.tags) {
                post.tags.split(',').forEach(t => {
                    const trimmed = t.trim();
                    if (trimmed) counts[trimmed] = (counts[trimmed] || 0) + 1;
                });
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [posts]);

    const handleAvatarClick = () => {
        if (isOwnProfile && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        setAvatarUploading(true);
        try {
            const compressed = await compressImage(file);
            const result = await USER_API.uploadAvatar(compressed, token);
            const newAvatarUrl = result.data.avatar_url;
            setProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));
            setGlobalAvatarUrl(newAvatarUrl);
        } catch (err) {
            alert(err.message || '프로필 이미지 업로드에 실패했습니다');
        } finally {
            setAvatarUploading(false);
            e.target.value = '';
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        Promise.all([
            USER_API.getProfile(userId, { signal: controller.signal }),
            POST_API.getUserPosts(userId, page, PAGE_SIZE, { signal: controller.signal, tag, token }),
        ])
            .then(([profileRes, postsRes]) => {
                if (profileRes.status === 'success') {
                    setProfile(profileRes.data);
                    document.title = `${profileRes.data.username} | Tolelog`;
                }

                const data = postsRes.data || postsRes;
                const list = Array.isArray(data) ? data : data.posts || [];
                const pagination = data.pagination;
                setPosts(list);
                if (pagination) {
                    setTotalPosts(pagination.total || list.length);
                    setTotalPages(pagination.total_pages || 0);
                    setHasMore(page < pagination.total_pages);
                } else {
                    setTotalPosts(list.length);
                    setHasMore(list.length === PAGE_SIZE);
                }
            })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                setError(err.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [userId, page, tag, token]);

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
                    <div
                        className={`profile-avatar${isOwnProfile ? ' profile-avatar-editable' : ''}`}
                        onClick={handleAvatarClick}
                    >
                        {profile.avatar_url ? (
                            <img
                                src={`${API_BASE_URL}${profile.avatar_url}`}
                                alt={profile.username}
                                className="profile-avatar-img"
                            />
                        ) : (
                            profile.username.charAt(0).toUpperCase()
                        )}
                        {isOwnProfile && (
                            <div className="profile-avatar-overlay">
                                {avatarUploading ? '...' : '변경'}
                            </div>
                        )}
                        {isOwnProfile && (
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleAvatarChange}
                                style={{ display: 'none' }}
                            />
                        )}
                    </div>
                    <h1 className="profile-username">{profile.username}</h1>
                    <div className="profile-stats">
                        <div className="profile-stat-item">
                            <span className="profile-stat-value">{totalPosts}</span>
                            <span className="profile-stat-label">글</span>
                        </div>
                        <div className="profile-stat-item">
                            <span className="profile-stat-value">{getMemberDays(profile.created_at)}</span>
                            <span className="profile-stat-label">일째</span>
                        </div>
                        <div className="profile-stat-item">
                            <span className="profile-stat-value">{tagCloud.length}</span>
                            <span className="profile-stat-label">태그</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 태그 클라우드 */}
            {tagCloud.length > 0 && !tag && (
                <div className="profile-tag-cloud">
                    <h3 className="profile-tag-cloud-title">태그</h3>
                    <div className="profile-tag-cloud-list">
                        {tagCloud.map(([tagName, count]) => (
                            <span
                                key={tagName}
                                className="tag-chip tag-chip-btn"
                                onClick={() => setSearchParams({ tag: tagName })}
                            >
                                {tagName} <span className="tag-count">{count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="profile-posts-section">
                <h2 className="profile-posts-title">
                    {isOwnProfile ? '내 글' : `${profile?.username || ''}의 글`}
                    {totalPosts > 0 && <span className="profile-posts-count">{totalPosts}</span>}
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
                        <span className="profile-page-num">
                            {totalPages > 0 ? `${page} / ${totalPages}` : page}
                        </span>
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
