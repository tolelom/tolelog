import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CommentSection from '../CommentSection';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makeComment } from '../../test-utils/fixtures';
import { COMMENT_API } from '../../utils/api';

vi.mock('../../utils/api', () => ({
    COMMENT_API: {
        getComments: vi.fn(),
        createComment: vi.fn(),
        deleteComment: vi.fn(),
    },
}));

const mockGetComments = vi.mocked(COMMENT_API.getComments);
const mockCreateComment = vi.mocked(COMMENT_API.createComment);

describe('CommentSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetComments.mockResolvedValue({
            status: 'success',
            data: { comments: [], total: 0 },
        });
    });

    it('로드된 댓글 목록과 개수를 렌더한다', async () => {
        mockGetComments.mockResolvedValueOnce({
            status: 'success',
            data: {
                comments: [
                    makeComment({ id: 1, author: 'alice', content: '첫 댓글' }),
                    makeComment({ id: 2, author: 'bob', content: '두 번째' }),
                ],
                total: 2,
            },
        });
        renderWithProviders(<CommentSection postId={1} />);
        expect(await screen.findByText('첫 댓글')).toBeInTheDocument();
        expect(screen.getByText('두 번째')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('비로그인 시 로그인 링크를 보여주고 작성 폼은 없다', async () => {
        renderWithProviders(<CommentSection postId={1} />);
        await waitFor(() => expect(mockGetComments).toHaveBeenCalled());
        expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('빈 목록이면 "아직 댓글이 없습니다" 메시지를 표시한다', async () => {
        renderWithProviders(<CommentSection postId={1} />);
        expect(await screen.findByText('아직 댓글이 없습니다.')).toBeInTheDocument();
    });

    it('댓글 작성 성공 시 createComment 호출 후 목록을 다시 로드한다', async () => {
        mockCreateComment.mockResolvedValueOnce({ status: 'success', data: makeComment() });
        renderWithProviders(<CommentSection postId={1} />, {
            authValue: { token: 'T', userId: 99 },
        });
        await waitFor(() => expect(mockGetComments).toHaveBeenCalledTimes(1));

        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: '새 댓글' } });
        fireEvent.click(screen.getByRole('button', { name: '댓글 작성' }));

        await waitFor(() => expect(mockCreateComment).toHaveBeenCalledWith(1, '새 댓글', 'T'));
        await waitFor(() => expect(mockGetComments).toHaveBeenCalledTimes(2));
    });

    it('댓글 작성 실패 시 인라인 에러를 표시한다 (toast 아님)', async () => {
        mockCreateComment.mockRejectedValueOnce(new Error('댓글 저장 실패'));
        renderWithProviders(<CommentSection postId={1} />, {
            authValue: { token: 'T', userId: 99 },
        });
        await waitFor(() => expect(mockGetComments).toHaveBeenCalled());

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });
        fireEvent.click(screen.getByRole('button', { name: '댓글 작성' }));

        expect(await screen.findByText('댓글 저장 실패')).toBeInTheDocument();
    });

    it('본인 댓글에만 삭제 버튼이 보인다', async () => {
        mockGetComments.mockResolvedValueOnce({
            status: 'success',
            data: {
                comments: [
                    makeComment({ id: 1, user_id: 42, author: 'me', content: '내 글' }),
                    makeComment({ id: 2, user_id: 77, author: 'other', content: '남 글' }),
                ],
                total: 2,
            },
        });
        renderWithProviders(<CommentSection postId={1} />, {
            authValue: { token: 'T', userId: 42 },
        });
        await screen.findByText('내 글');
        expect(screen.getByRole('button', { name: /me의 댓글 삭제/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /other의 댓글 삭제/ })).toBeNull();
    });
});
