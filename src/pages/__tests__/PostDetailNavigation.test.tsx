import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Link } from 'react-router-dom';
import PostDetailPage from '../PostDetailPage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makePost } from '../../test-utils/fixtures';
import { POST_API, LIKE_API, COMMENT_API, SERIES_API } from '../../utils/api';

// 같은 라우트(/post/:postId) 안에서 다른 글로 옮겨 가는 경우. 시리즈 이전·다음 링크가 이 경로를 탄다.

vi.stubGlobal('IntersectionObserver', class { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); });

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...actual, useLoaderData: () => null };
});

vi.mock('../../utils/api', () => ({
    POST_API: { getPost: vi.fn(), deletePost: vi.fn() },
    LIKE_API: { getStatus: vi.fn(), toggle: vi.fn() },
    COMMENT_API: { getComments: vi.fn() },
    SERIES_API: { getSeriesNav: vi.fn(), getSeries: vi.fn() },
}));

vi.mock('vite-react-ssg', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetPost = vi.mocked(POST_API.getPost);

function renderAt(route: string, linkTo: string) {
    return renderWithProviders(
        <><Link to={linkTo}>다른 글로</Link><PostDetailPage /></>,
        { route, path: '/post/:postId' },
    );
}

describe('PostDetailPage 글 사이 이동', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(COMMENT_API.getComments).mockResolvedValue({ status: 'success', data: { comments: [], total: 0 } });
        vi.mocked(LIKE_API.getStatus).mockResolvedValue({ status: 'success', data: { liked: false } });
        vi.mocked(SERIES_API.getSeriesNav).mockResolvedValue({ status: 'success', data: null });
    });

    it('다른 글 링크를 누르면 그 글을 보여 주고 이전 글로 되돌아가지 않는다', async () => {
        mockGetPost.mockImplementation(async (id) =>
            ({ status: 'success', data: makePost({ id: Number(id), title: Number(id) === 1 ? 'alpha' : 'beta' }) }));
        renderAt('/post/alpha-1', '/post/beta-2');
        expect(await screen.findByRole('heading', { name: 'alpha' })).toBeInTheDocument();

        fireEvent.click(screen.getByText('다른 글로'));

        expect(await screen.findByRole('heading', { name: 'beta' })).toBeInTheDocument();
        await new Promise(r => setTimeout(r, 50));
        expect(screen.getByRole('heading', { name: 'beta' })).toBeInTheDocument();
        expect(mockGetPost.mock.calls.map(c => c[0])).toEqual(['1', '2']);
    });

    it('앞 글을 못 불러왔어도 다음 글로 가면 오류 화면이 남지 않는다', async () => {
        mockGetPost.mockImplementation(async (id) => {
            if (Number(id) === 1) throw new Error('글을 불러오지 못했습니다 (403)');
            return { status: 'success', data: makePost({ id: 2, title: 'beta' }) };
        });
        renderAt('/post/alpha-1', '/post/beta-2');
        expect(await screen.findByText(/글을 불러오지 못했습니다 \(403\)/)).toBeInTheDocument();

        fireEvent.click(screen.getByText('다른 글로'));

        expect(await screen.findByRole('heading', { name: 'beta' })).toBeInTheDocument();
        expect(screen.queryByText(/글을 불러오지 못했습니다 \(403\)/)).not.toBeInTheDocument();
    });

    it('좋아요한 글에서 넘어가면 다음 글의 좋아요 상태로 바뀐다', async () => {
        mockGetPost.mockImplementation(async (id) =>
            ({ status: 'success', data: makePost({ id: Number(id), title: Number(id) === 1 ? 'alpha' : 'beta' }) }));
        vi.mocked(LIKE_API.getStatus).mockImplementation(async (id) => ({ status: 'success', data: { liked: Number(id) === 1 } }));
        renderWithProviders(
            <><Link to="/post/beta-2">다른 글로</Link><PostDetailPage /></>,
            { route: '/post/alpha-1', path: '/post/:postId', authValue: { token: 't', userId: 9 } },
        );
        await screen.findByRole('heading', { name: 'alpha' });
        expect(await screen.findByTitle('좋아요 취소')).toHaveTextContent('♥');

        fireEvent.click(screen.getByText('다른 글로'));

        await screen.findByRole('heading', { name: 'beta' });
        expect(await screen.findByTitle('좋아요')).toHaveTextContent('♡');
    });
});
