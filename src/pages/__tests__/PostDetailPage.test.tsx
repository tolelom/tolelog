import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import PostDetailPage from '../PostDetailPage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makePost } from '../../test-utils/fixtures';
import { POST_API, LIKE_API, COMMENT_API, SERIES_API } from '../../utils/api';

// jsdom does not implement IntersectionObserver — provide a no-op stub
class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ postId: '1' }),
    };
});

vi.mock('../../utils/api', () => ({
    POST_API: { getPost: vi.fn(), deletePost: vi.fn() },
    LIKE_API: { getStatus: vi.fn(), toggle: vi.fn() },
    COMMENT_API: { getComments: vi.fn() },
    SERIES_API: { getSeriesNav: vi.fn(), getSeries: vi.fn() },
}));

const mockGetPost = vi.mocked(POST_API.getPost);
const mockGetStatus = vi.mocked(LIKE_API.getStatus);
const mockToggle = vi.mocked(LIKE_API.toggle);
const mockGetComments = vi.mocked(COMMENT_API.getComments);
const mockGetSeriesNav = vi.mocked(SERIES_API.getSeriesNav);

describe('PostDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetComments.mockResolvedValue({ status: 'success', data: { comments: [], total: 0 } });
        mockGetStatus.mockResolvedValue({ status: 'success', data: { liked: false } });
        mockGetSeriesNav.mockResolvedValue({ status: 'success', data: null });
    });

    it('글을 렌더한다 (제목, 작성자, 본문)', async () => {
        mockGetPost.mockResolvedValueOnce({
            status: 'success',
            data: makePost({ title: '내 글', author: 'alice', content: '본문 문단' }),
        });
        renderWithProviders(<PostDetailPage />);
        // title appears in both breadcrumb and h1 — use heading role
        expect(await screen.findByRole('heading', { name: '내 글' })).toBeInTheDocument();
        expect(screen.getByText(/alice/)).toBeInTheDocument();
        expect(screen.getByText('본문 문단')).toBeInTheDocument();
    });

    it('글을 찾지 못하면 에러 메시지를 표시한다', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockGetPost.mockResolvedValueOnce({ status: 'error', message: 'not found' } as any);
        renderWithProviders(<PostDetailPage />);
        expect(await screen.findByText(/글을 찾을 수 없습니다/)).toBeInTheDocument();
    });

    it('비로그인 시 좋아요 버튼이 비활성화된다', async () => {
        mockGetPost.mockResolvedValueOnce({ status: 'success', data: makePost() });
        renderWithProviders(<PostDetailPage />);
        const btn = await screen.findByTitle(/로그인 후 이용 가능/);
        expect(btn).toBeDisabled();
    });

    it('좋아요 클릭 시 LIKE_API.toggle이 호출되고 count/liked가 업데이트된다', async () => {
        mockGetPost.mockResolvedValueOnce({
            status: 'success',
            data: makePost({ like_count: 5 }),
        });
        mockToggle.mockResolvedValueOnce({
            status: 'success',
            data: { liked: true, like_count: 6 },
        });
        renderWithProviders(<PostDetailPage />, {
            authValue: { token: 'T', userId: 99 },
        });
        const btn = await screen.findByTitle('좋아요');
        fireEvent.click(btn);
        await waitFor(() => expect(mockToggle).toHaveBeenCalledWith('1', 'T'));
        await screen.findByText('6');
    });

    it('댓글 섹션이 렌더된다 (빈 목록이라도)', async () => {
        mockGetPost.mockResolvedValueOnce({ status: 'success', data: makePost() });
        renderWithProviders(<PostDetailPage />);
        // wait for post to load by finding the h1 heading
        await screen.findByRole('heading', { name: makePost().title });
        expect(await screen.findByText('아직 댓글이 없습니다.')).toBeInTheDocument();
    });

    it('본인 글에만 삭제 버튼이 보인다', async () => {
        mockGetPost.mockResolvedValueOnce({
            status: 'success',
            data: makePost({ user_id: 42 }),
        });
        renderWithProviders(<PostDetailPage />, {
            authValue: { token: 'T', userId: 42 },
        });
        expect(await screen.findByRole('button', { name: /삭제/ })).toBeInTheDocument();
    });
});
