import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import SeriesDetailPage from '../SeriesDetailPage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { SERIES_API } from '../../utils/api';
import type { SeriesDetail } from '../../types';

vi.mock('../../utils/api', () => ({
    SERIES_API: { getSeries: vi.fn(), removePost: vi.fn(), reorderPosts: vi.fn() },
}));

vi.mock('vite-react-ssg', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetSeries = vi.mocked(SERIES_API.getSeries);
const mockRemovePost = vi.mocked(SERIES_API.removePost);
const mockReorderPosts = vi.mocked(SERIES_API.reorderPosts);

function series(postTitles: string[] = ['#1 시작', '#2 포인터', '#3 배열']): SeriesDetail {
    return {
        id: 2,
        title: 'C 언어 기초',
        description: 'C 를 처음부터',
        user_id: 1,
        author: 'tolelom',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        posts: postTitles.map((title, i) => ({ id: 10 + i, title, order: i + 1, created_at: '2026-01-01T00:00:00Z' })),
    };
}

const ok = (data: SeriesDetail) => ({ status: 'success', data });
const owner = { userId: 1, token: 'owner-token' };

function renderPage(authValue = {}) {
    return renderWithProviders(<SeriesDetailPage />, { route: '/series/2', path: '/series/:seriesId', authValue });
}

function postTitles() {
    return screen.getAllByText(/^#\d/).map(e => e.textContent);
}

describe('SeriesDetailPage', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('방문자에게는 순서대로 글 목록만 보여 주고 편집 버튼을 숨긴다', async () => {
        mockGetSeries.mockResolvedValue(ok(series()));
        renderPage({ userId: 4, token: 'other-token' });

        expect(await screen.findByRole('heading', { name: 'C 언어 기초' })).toBeInTheDocument();
        expect(screen.getByText('C 를 처음부터')).toBeInTheDocument();
        expect(screen.getByText('3개의 글')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'tolelom' })).toHaveAttribute('href', '/user/1');
        expect(screen.getByRole('link', { name: /#2 포인터/ })).toHaveAttribute('href', expect.stringMatching(/^\/post\/.*-11$/));
        expect(screen.queryByRole('button', { name: '아래로 이동' })).not.toBeInTheDocument();
        expect(mockGetSeries).toHaveBeenCalledWith('2', expect.objectContaining({ token: 'other-token' }));
    });

    it('로그인 상태를 읽기 전에는 불러오지 않는다', () => {
        mockGetSeries.mockResolvedValue(ok(series()));
        renderPage({ ready: false });
        expect(mockGetSeries).not.toHaveBeenCalled();
    });

    it('작성자가 글을 내리면 바로 순서를 바꾸고 새 순서를 저장한다', async () => {
        mockGetSeries.mockResolvedValue(ok(series()));
        mockReorderPosts.mockResolvedValue({ status: 'success', data: null } as never);
        renderPage(owner);
        await screen.findByRole('heading', { name: 'C 언어 기초' });
        expect(screen.getAllByRole('button', { name: '위로 이동' })[0]).toBeDisabled();
        expect(screen.getAllByRole('button', { name: '아래로 이동' })[2]).toBeDisabled();

        fireEvent.click(screen.getAllByRole('button', { name: '아래로 이동' })[0]);

        expect(postTitles()).toEqual(['#2 포인터', '#1 시작', '#3 배열']);
        expect(mockReorderPosts).toHaveBeenCalledWith('2', [11, 10, 12], 'owner-token');
    });

    it('순서 저장이 실패하면 오류를 보여 주고 서버 순서로 되돌린다', async () => {
        mockGetSeries.mockResolvedValue(ok(series()));
        mockReorderPosts.mockRejectedValue(new Error('순서 변경에 실패했습니다'));
        renderPage(owner);
        await screen.findByRole('heading', { name: 'C 언어 기초' });

        fireEvent.click(screen.getAllByRole('button', { name: '위로 이동' })[2]);

        expect(await screen.findByText('순서 변경에 실패했습니다')).toBeInTheDocument();
        await waitFor(() => expect(postTitles()).toEqual(['#1 시작', '#2 포인터', '#3 배열']));
        expect(mockGetSeries).toHaveBeenCalledTimes(2);
    });

    it('작성자가 글을 빼면 다시 불러와 목록에서 사라진다', async () => {
        mockGetSeries.mockResolvedValueOnce(ok(series())).mockResolvedValueOnce(ok(series(['#1 시작', '#3 배열'])));
        mockRemovePost.mockResolvedValue({ status: 'success', data: null } as never);
        renderPage(owner);
        await screen.findByRole('heading', { name: 'C 언어 기초' });

        fireEvent.click(screen.getByRole('button', { name: '#2 포인터 제거' }));

        await waitFor(() => expect(screen.queryByText('#2 포인터')).not.toBeInTheDocument());
        expect(mockRemovePost).toHaveBeenCalledWith('2', 11, 'owner-token');
        expect(screen.getByText('2개의 글')).toBeInTheDocument();
    });

    it('불러오기에 실패하면 오류와 홈 링크를 보여 준다', async () => {
        mockGetSeries.mockRejectedValue(new Error('시리즈를 불러오지 못했습니다 (404)'));
        renderPage();

        expect(await screen.findByText('시리즈를 불러오지 못했습니다 (404)')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '홈으로 돌아가기' })).toHaveAttribute('href', '/');
    });
});
