import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import HomePage from '../HomePage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { POST_API, SERIES_API, TAG_API, USER_API } from '../../utils/api';
import { clearCache } from '../../utils/apiCache';
import type { PostListItem } from '../../types';

vi.mock('../../utils/api', () => ({
    POST_API: { getPublicPosts: vi.fn(), searchPosts: vi.fn() },
    SERIES_API: { getUserSeries: vi.fn() },
    TAG_API: { getTags: vi.fn() },
    USER_API: { getProfile: vi.fn() },
}));

vi.mock('vite-react-ssg', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetPublicPosts = vi.mocked(POST_API.getPublicPosts);
const mockSearchPosts = vi.mocked(POST_API.searchPosts);
const mockGetUserSeries = vi.mocked(SERIES_API.getUserSeries);
const mockGetTags = vi.mocked(TAG_API.getTags);
const mockGetProfile = vi.mocked(USER_API.getProfile);

function item(overrides: Partial<PostListItem> = {}): PostListItem {
    return {
        id: 1,
        title: '첫 글',
        user_id: 1,
        author: 'tolelom',
        is_public: true,
        tags: '',
        view_count: 0,
        like_count: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

function listResponse(posts: PostListItem[], page = 1, totalPages = 1) {
    return {
        status: 'success',
        data: { posts, pagination: { page, page_size: 10, total: posts.length, total_pages: totalPages } },
    };
}

describe('HomePage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        clearCache();
        vi.stubGlobal('scrollTo', vi.fn());
        mockGetPublicPosts.mockResolvedValue(listResponse([]));
        mockSearchPosts.mockResolvedValue(listResponse([]));
        mockGetUserSeries.mockResolvedValue({ status: 'success', data: [] });
        mockGetTags.mockResolvedValue({ status: 'success', data: [] });
        mockGetProfile.mockResolvedValue({
            status: 'success',
            data: { id: 1, username: 'tolelom', avatar_url: '', created_at: '', last_login: '' },
        });
    });

    it('공개 글을 글 주소 링크로 보여 주고 태그·시리즈·조회수를 붙인다', async () => {
        mockGetPublicPosts.mockResolvedValue(listResponse([
            item({ id: 3, title: 'Mark and Sweep', tags: 'gc, c', view_count: 5, series: { series_id: 2, series_title: 'C 언어 기초', series_order: 1 }, excerpt: '요약' }),
        ]));

        renderWithProviders(<HomePage />);

        const card = (await screen.findByRole('heading', { name: 'Mark and Sweep' })).closest('a')!;
        expect(card).toHaveAttribute('href', '/post/mark-and-sweep-3');
        expect(within(card).getByText('조회 5')).toBeInTheDocument();
        expect(within(card).getByText('C 언어 기초')).toBeInTheDocument();
        expect(within(card).getByRole('button', { name: 'gc' })).toBeInTheDocument();
        expect(within(card).getByRole('button', { name: 'c' })).toBeInTheDocument();
        expect(within(card).getByText('요약')).toBeInTheDocument();
        expect(mockGetPublicPosts).toHaveBeenCalledWith(1, 10, expect.objectContaining({ tag: '' }));
    });

    it('첫 페이지에 시리즈와 인기 태그를 보여 준다', async () => {
        mockGetUserSeries.mockResolvedValue({
            status: 'success',
            data: [{ id: 2, title: 'C 언어 기초', description: '', user_id: 1, author: 'tolelom', post_count: 11, created_at: '', updated_at: '' }],
        });
        mockGetTags.mockResolvedValue({ status: 'success', data: [{ name: 'C', count: 11 }] });

        renderWithProviders(<HomePage />);

        expect(await screen.findByRole('link', { name: /C 언어 기초\s*11편/ })).toHaveAttribute('href', '/series/2');
        expect(await screen.findByRole('button', { name: 'C 태그로 필터링 (11개)' })).toBeInTheDocument();
    });

    it('인기 태그를 누르면 그 태그로 다시 불러오고 시리즈·인기 태그를 숨긴다', async () => {
        mockGetUserSeries.mockResolvedValue({
            status: 'success',
            data: [{ id: 2, title: 'C 언어 기초', description: '', user_id: 1, author: 'tolelom', post_count: 11, created_at: '', updated_at: '' }],
        });
        mockGetTags.mockResolvedValue({ status: 'success', data: [{ name: 'C', count: 11 }] });

        renderWithProviders(<HomePage />);
        fireEvent.click(await screen.findByRole('button', { name: 'C 태그로 필터링 (11개)' }));

        await waitFor(() => expect(mockGetPublicPosts).toHaveBeenLastCalledWith(1, 10, expect.objectContaining({ tag: 'C' })));
        expect(await screen.findByText("'C' 태그가 포함된 글이 없습니다.")).toBeInTheDocument();
        expect(screen.queryByText('시리즈')).not.toBeInTheDocument();
        expect(screen.queryByText('인기 태그')).not.toBeInTheDocument();
    });

    it('검색어를 입력하면 잠시 뒤 검색 API 로 찾는다', async () => {
        mockSearchPosts.mockResolvedValue(listResponse([item({ id: 9, title: '가비지 컬렉션' })]));
        renderWithProviders(<HomePage />);
        await screen.findByText('아직 작성된 글이 없습니다.');

        fireEvent.change(screen.getByPlaceholderText('글 검색...'), { target: { value: ' 가비지 ' } });

        expect(await screen.findByRole('heading', { name: '가비지 컬렉션' }, { timeout: 2000 })).toBeInTheDocument();
        expect(mockSearchPosts).toHaveBeenCalledWith('가비지', 1, 10, expect.anything());
        expect(screen.getByText('가비지', { selector: 'strong' })).toBeInTheDocument();
    });

    it('다음 페이지로 넘어가고 마지막 페이지에서는 다음 버튼을 막는다', async () => {
        mockGetPublicPosts.mockImplementation(async (page = 1) =>
            listResponse([item({ id: page, title: `${page}쪽 글` })], page, 2));

        renderWithProviders(<HomePage />);
        expect(await screen.findByText('1 / 2')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '← 이전' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: '다음 →' }));

        expect(await screen.findByRole('heading', { name: '2쪽 글' })).toBeInTheDocument();
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '다음 →' })).toBeDisabled();
    });

    it('목록을 못 불러오면 오류를 보여 주고 다시 시도할 수 있다', async () => {
        mockGetPublicPosts.mockRejectedValueOnce(new Error('글 목록을 불러오지 못했습니다 (500)'));
        mockGetPublicPosts.mockResolvedValueOnce(listResponse([item({ title: '복구된 글' })]));

        renderWithProviders(<HomePage />);
        expect(await screen.findByText('오류가 발생했습니다: 글 목록을 불러오지 못했습니다 (500)')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

        expect(await screen.findByRole('heading', { name: '복구된 글' })).toBeInTheDocument();
    });

    it('글 카드의 작성자를 누르면 프로필로 간다', async () => {
        mockGetPublicPosts.mockResolvedValue(listResponse([item({ user_id: 4, author: 'guest' })]));
        renderWithProviders(<HomePage />, { path: '/' });

        fireEvent.click(await screen.findByRole('link', { name: 'guest' }));

        await waitFor(() => expect(screen.queryByRole('heading', { name: '첫 글' })).not.toBeInTheDocument());
    });
});
