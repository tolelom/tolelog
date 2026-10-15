import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import UserProfilePage from '../UserProfilePage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { USER_API, POST_API, SERIES_API } from '../../utils/api';
import { compressImage, validateImageFile } from '../../utils/imageUpload';
import type { PostListItem, Series } from '../../types';

vi.mock('../../utils/api', () => ({
    USER_API: { getProfile: vi.fn(), uploadAvatar: vi.fn() },
    POST_API: { getUserPosts: vi.fn() },
    SERIES_API: { getUserSeries: vi.fn(), deleteSeries: vi.fn() },
}));

vi.mock('../../utils/imageUpload', () => ({
    validateImageFile: vi.fn(),
    compressImage: vi.fn(),
}));

vi.mock('vite-react-ssg', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetProfile = vi.mocked(USER_API.getProfile);
const mockUploadAvatar = vi.mocked(USER_API.uploadAvatar);
const mockGetUserPosts = vi.mocked(POST_API.getUserPosts);
const mockGetUserSeries = vi.mocked(SERIES_API.getUserSeries);
const mockDeleteSeries = vi.mocked(SERIES_API.deleteSeries);
const mockValidate = vi.mocked(validateImageFile);
const mockCompress = vi.mocked(compressImage);

function item(overrides: Partial<PostListItem> = {}): PostListItem {
    return {
        id: 1, title: '첫 글', user_id: 1, author: 'tolelom', is_public: true, tags: '',
        view_count: 0, like_count: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

const cSeries: Series = { id: 2, title: 'C 언어 기초', description: '', user_id: 1, author: 'tolelom', post_count: 11, created_at: '', updated_at: '' };

function postsResponse(posts: PostListItem[], total = posts.length, totalPages = 1) {
    return { status: 'success', data: { posts, pagination: { page: 1, page_size: 10, total, total_pages: totalPages } } };
}

function renderProfile(authValue = {}) {
    return renderWithProviders(<UserProfilePage />, { route: '/user/1', path: '/user/:userId', authValue });
}

describe('UserProfilePage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mockGetProfile.mockResolvedValue({
            status: 'success',
            data: { id: 1, username: 'tolelom', avatar_url: '', created_at: '2026-01-01T00:00:00Z', last_login: '' },
        });
        mockGetUserPosts.mockResolvedValue(postsResponse([]));
        mockGetUserSeries.mockResolvedValue({ status: 'success', data: [] });
    });

    it('방문자에게 프로필·글 수·시리즈 수와 글 목록을 보여 주고 사진 변경은 막는다', async () => {
        mockGetUserPosts.mockResolvedValue(postsResponse([item({ title: 'Mark and Sweep', tags: 'gc, c' })], 12, 2));
        mockGetUserSeries.mockResolvedValue({ status: 'success', data: [cSeries] });

        renderProfile();

        expect(await screen.findByRole('heading', { name: 'tolelom', level: 1 })).toBeInTheDocument();
        const stats = screen.getByText('글', { selector: '.profile-stat-label' }).parentElement!;
        expect(within(stats).getByText('12')).toBeInTheDocument();
        expect(screen.getByText('시리즈', { selector: '.profile-stat-label' }).previousSibling).toHaveTextContent('1');
        expect(screen.getByRole('heading', { name: 'Mark and Sweep' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '프로필 사진 변경' })).not.toBeInTheDocument();
        expect(mockGetUserPosts).toHaveBeenCalledWith('1', 1, 10, expect.objectContaining({ tag: '', token: undefined }));
    });

    it('로그인한 사용자의 토큰을 넘겨 본인에게만 보이는 글까지 받는다', async () => {
        renderProfile({ userId: 1, token: 'owner-token' });

        await screen.findByRole('heading', { name: 'tolelom', level: 1 });
        expect(mockGetUserPosts).toHaveBeenCalledWith('1', 1, 10, expect.objectContaining({ token: 'owner-token' }));
        expect(screen.getByRole('button', { name: '프로필 사진 변경' })).toBeInTheDocument();
    });

    it('다른 사용자로 로그인해 남의 프로필을 보면 편집 기능이 없다', async () => {
        mockGetUserSeries.mockResolvedValue({ status: 'success', data: [cSeries] });
        renderProfile({ userId: 4, token: 'other-token' });

        await screen.findByRole('heading', { name: 'tolelom', level: 1 });
        expect(screen.queryByRole('button', { name: '프로필 사진 변경' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /^시리즈/ }));
        expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '+ 새 시리즈' })).not.toBeInTheDocument();
    });

    it('로그인 상태를 읽기 전에는 불러오지 않는다', () => {
        renderProfile({ ready: false });
        expect(mockGetProfile).not.toHaveBeenCalled();
        expect(mockGetUserPosts).not.toHaveBeenCalled();
    });

    it('태그를 누르면 그 태그로 다시 불러온다', async () => {
        mockGetUserPosts.mockResolvedValue(postsResponse([item({ tags: 'gc, c' }), item({ id: 2, title: '둘째', tags: 'gc' })]));
        renderProfile();
        const cloud = (await screen.findByText('태그', { selector: 'h3' })).parentElement!;

        expect(within(cloud).getByRole('button', { name: 'gc 2' })).toBeInTheDocument();
        fireEvent.click(within(cloud).getByRole('button', { name: 'gc 2' }));

        await waitFor(() => expect(mockGetUserPosts).toHaveBeenLastCalledWith('1', 1, 10, expect.objectContaining({ tag: 'gc' })));
    });

    it('시리즈 탭에서 작성자는 시리즈를 지울 수 있고 지운 뒤 목록을 다시 받는다', async () => {
        mockGetUserSeries.mockResolvedValueOnce({ status: 'success', data: [cSeries] }).mockResolvedValueOnce({ status: 'success', data: [] });
        mockDeleteSeries.mockResolvedValue(undefined as never);
        renderProfile({ userId: 1, token: 'owner-token' });

        fireEvent.click(await screen.findByRole('button', { name: /^시리즈/ }));
        expect(screen.getByRole('link', { name: /C 언어 기초/ })).toHaveAttribute('href', '/series/2');
        fireEvent.click(screen.getByRole('button', { name: '삭제' }));
        fireEvent.click(screen.getByRole('button', { name: '확인' }));

        expect(await screen.findByText('아직 시리즈가 없습니다.')).toBeInTheDocument();
        expect(mockDeleteSeries).toHaveBeenCalledWith(2, 'owner-token');
    });

    it('작성자가 사진을 올리면 프로필과 전역 아바타를 바꾼다', async () => {
        const setAvatarUrl = vi.fn();
        mockValidate.mockReturnValue({ valid: true });
        mockCompress.mockImplementation(async (f: File) => f);
        mockUploadAvatar.mockResolvedValue({ status: 'success', data: { avatar_url: '/uploads/images/a.png' } });
        const { container } = renderProfile({ userId: 1, token: 'owner-token', setAvatarUrl });
        await screen.findByRole('heading', { name: 'tolelom', level: 1 });

        const file = new File(['x'], 'a.png', { type: 'image/png' });
        fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });

        await waitFor(() => expect(setAvatarUrl).toHaveBeenCalledWith('/uploads/images/a.png'));
        expect(screen.getByRole('img', { name: 'tolelom' })).toHaveAttribute('src', expect.stringMatching(/\/uploads\/images\/a\.png$/));
        expect(mockUploadAvatar).toHaveBeenCalledWith(file, 'owner-token');
    });

    it('올바르지 않은 사진이면 올리지 않고 이유를 보여 준다', async () => {
        mockValidate.mockReturnValue({ valid: false, error: '5MB 이하 이미지만 올릴 수 있습니다' });
        const { container } = renderProfile({ userId: 1, token: 'owner-token' });
        await screen.findByRole('heading', { name: 'tolelom', level: 1 });

        fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'big.png')] } });

        expect(await screen.findByText('5MB 이하 이미지만 올릴 수 있습니다', { selector: '.profile-avatar-error' })).toBeInTheDocument();
        expect(mockUploadAvatar).not.toHaveBeenCalled();
    });

    it('불러오기에 실패하면 오류와 홈 링크를 보여 준다', async () => {
        mockGetProfile.mockRejectedValue(new Error('사용자 프로필을 불러오지 못했습니다 (404)'));
        renderProfile();

        expect(await screen.findByText('오류가 발생했습니다: 사용자 프로필을 불러오지 못했습니다 (404)')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
    });
});
