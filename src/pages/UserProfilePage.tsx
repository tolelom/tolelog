import { useState, useEffect, useContext, useMemo, useRef, useCallback, ChangeEvent } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { USER_API, POST_API, SERIES_API } from '../utils/api';
import { validateImageFile, compressImage } from '../utils/imageUpload';
import { API_BASE_URL } from '../utils/constants';
import PageMeta from '../components/PageMeta';
import { notify as toast } from '../utils/notify';
import { User, PostListItem, Pagination, PostListWithPagination, Series } from '../types';
import ProfileSeriesSection from '../components/profile/ProfileSeriesSection';
import ProfilePostList from '../components/profile/ProfilePostList';
import './UserProfilePage.css';

const PAGE_SIZE = 10;

function getMemberDays(createdAt: string | undefined): number {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return 0;
    return Math.max(1, Math.ceil((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function UserProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const { userId: currentUserId, token, setAvatarUrl: setGlobalAvatarUrl } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const page: number = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const tag: string = searchParams.get('tag') || '';
    const [profile, setProfile] = useState<User | null>(null);
    const [posts, setPosts] = useState<PostListItem[]>([]);
    const [totalPosts, setTotalPosts] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [hasMore, setHasMore] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
    const [avatarError, setAvatarError] = useState<string>('');
    const [seriesList, setSeriesList] = useState<Series[]>([]);
    const [activeTab, setActiveTab] = useState<'posts' | 'series'>('posts');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const isOwner = !!(currentUserId && String(currentUserId) === String(userId));

    // 현재 보이는 글에서 태그 집계
    const tagCloud = useMemo<[string, number][]>(() => {
        const counts: Record<string, number> = {};
        posts.forEach((post: PostListItem) => {
            if (post.tags) {
                post.tags.split(',').forEach((t: string) => {
                    const trimmed = t.trim();
                    if (trimmed) counts[trimmed] = (counts[trimmed] || 0) + 1;
                });
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [posts]);

    const handleAvatarClick = () => {
        if (isOwner && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        const validation = validateImageFile(file);
        if (!validation.valid) {
            const msg = validation.error || '유효하지 않은 이미지입니다.';
            setAvatarError(msg);
            toast.error(msg);
            return;
        }

        setAvatarUploading(true);
        setAvatarError('');
        try {
            const compressed = await compressImage(file);
            const result = await USER_API.uploadAvatar(compressed, token);
            const newAvatarUrl: string = result.data.avatar_url;
            setProfile((prev: User | null) => prev ? { ...prev, avatar_url: newAvatarUrl } : prev);
            setGlobalAvatarUrl(newAvatarUrl);
            toast.success('프로필 이미지를 변경했습니다.');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '프로필 이미지 업로드에 실패했습니다';
            setAvatarError(msg);
            toast.error(msg);
        } finally {
            setAvatarUploading(false);
            e.target.value = '';
        }
    };

    const handlePrevPage = useCallback(() => {
        const params: Record<string, string> = {};
        if (tag) params.tag = tag;
        if (page - 1 > 1) params.page = String(page - 1);
        setSearchParams(params);
    }, [page, tag, setSearchParams]);

    const handleNextPage = useCallback(() => {
        const params: Record<string, string> = { page: String(page + 1) };
        if (tag) params.tag = tag;
        setSearchParams(params);
    }, [page, tag, setSearchParams]);

    const handleTagClick = useCallback((clickedTag: string) => {
        setSearchParams(tag === clickedTag ? {} : { tag: clickedTag });
    }, [tag, setSearchParams]);

    const handleClearTagFilter = useCallback(() => {
        setSearchParams({});
    }, [setSearchParams]);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        Promise.all([
            USER_API.getProfile(userId!, { signal: controller.signal }),
            POST_API.getUserPosts(userId!, page, PAGE_SIZE, { signal: controller.signal, tag, token: token ?? undefined }),
            SERIES_API.getUserSeries(userId!, { signal: controller.signal }),
        ])
            .then(([profileRes, postsRes, seriesRes]) => {
                if (profileRes.status === 'success') {
                    setProfile(profileRes.data);
                }

                if (seriesRes.status === 'success') {
                    setSeriesList(seriesRes.data || []);
                }

                const data = postsRes.data;
                const list: PostListItem[] = Array.isArray(data) ? data : data.posts || [];
                const pagination: Pagination | undefined = (data as PostListWithPagination).pagination;
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
            .catch((err: Error) => {
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
                <div className="profile-info">
                    <div className="skeleton skeleton-circle skeleton-h-80 skeleton-mx-auto skeleton-mb-16" />
                    <div className="skeleton skeleton-text-lg skeleton-w-120 skeleton-mx-auto skeleton-mb-16" />
                    <div className="skeleton-stats-row">
                        <div className="skeleton skeleton-w-40 skeleton-h-28" />
                        <div className="skeleton skeleton-w-40 skeleton-h-28" />
                    </div>
                </div>
                <div className="skeleton-list">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton skeleton-text-lg skeleton-w-65p" />
                            <div className="skeleton-meta-row">
                                <div className="skeleton skeleton-text-sm skeleton-w-70" />
                                <div className="skeleton skeleton-text-sm skeleton-w-50" />
                            </div>
                            <div className="skeleton skeleton-text skeleton-w-90p" />
                        </div>
                    ))}
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

    const profileDescription = profile
        ? `${profile.username}님의 Tolelog 프로필 — ${totalPosts}개의 글`
        : undefined;
    const profileOgImage = profile?.avatar_url
        ? (profile.avatar_url.startsWith('http') ? profile.avatar_url : `${API_BASE_URL}${profile.avatar_url}`)
        : undefined;

    return (
        <div className="profile-page">
            {profile && (
                <PageMeta
                    title={profile.username}
                    description={profileDescription}
                    canonical={`/user/${profile.id}`}
                    ogImage={profileOgImage}
                    ogType="profile"
                />
            )}
            {profile && (
                <div className="profile-info">
                    <div
                        className={`profile-avatar${isOwner ? ' profile-avatar-editable' : ''}`}
                        onClick={handleAvatarClick}
                        role={isOwner ? 'button' : undefined}
                        tabIndex={isOwner ? 0 : undefined}
                        aria-label={isOwner ? '프로필 사진 변경' : undefined}
                        onKeyDown={isOwner ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAvatarClick(); } } : undefined}
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
                        {isOwner && (
                            <div className="profile-avatar-overlay">
                                {avatarUploading ? '...' : '변경'}
                            </div>
                        )}
                        {isOwner && (
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
                    {avatarError && <p className="profile-avatar-error">{avatarError}</p>}
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
                            <span className="profile-stat-value">{seriesList.length}</span>
                            <span className="profile-stat-label">시리즈</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 태그 클라우드 */}
            {tagCloud.length > 0 && !tag && (
                <div className="profile-tag-cloud">
                    <h3 className="profile-tag-cloud-title">태그</h3>
                    <div className="profile-tag-cloud-list">
                        {tagCloud.map(([tagName, count]: [string, number]) => (
                            <button
                                key={tagName}
                                type="button"
                                className="tag-chip tag-chip-btn"
                                onClick={() => setSearchParams({ tag: tagName })}
                            >
                                {tagName} <span className="tag-count">{count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 탭 */}
            <div className="profile-tabs">
                <button
                    className={`profile-tab${activeTab === 'posts' ? ' profile-tab-active' : ''}`}
                    onClick={() => setActiveTab('posts')}
                >
                    글 {totalPosts > 0 && <span className="profile-tab-count">{totalPosts}</span>}
                </button>
                <button
                    className={`profile-tab${activeTab === 'series' ? ' profile-tab-active' : ''}`}
                    onClick={() => setActiveTab('series')}
                >
                    시리즈 {seriesList.length > 0 && <span className="profile-tab-count">{seriesList.length}</span>}
                </button>
            </div>

            {/* 시리즈 탭 */}
            {activeTab === 'series' && (
                <ProfileSeriesSection
                    seriesList={seriesList}
                    isOwner={isOwner}
                    token={token}
                    userId={userId!}
                    onSeriesChange={setSeriesList}
                />
            )}

            {/* 글 탭 */}
            {activeTab === 'posts' && (
                <ProfilePostList
                    posts={posts}
                    totalPosts={totalPosts}
                    page={page}
                    totalPages={totalPages}
                    hasMore={hasMore}
                    tagFilter={tag || null}
                    isOwner={isOwner}
                    profileUsername={profile?.username || ''}
                    onClearTagFilter={handleClearTagFilter}
                    onTagClick={handleTagClick}
                    onPrevPage={handlePrevPage}
                    onNextPage={handleNextPage}
                />
            )}
        </div>
    );
}
