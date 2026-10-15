import { request } from './client';
import type { SuccessResponse, Comment as CommentType, CommentListResponse } from '../../types';

export const COMMENT_API = {
    getComments: async (postId: number | string, { signal, token }: { signal?: AbortSignal; token?: string } = {}): Promise<SuccessResponse<CommentListResponse>> => {
        return request(`/api/v1/posts/${postId}/comments`, { auth: 'optional', token, signal, errorMessage: '댓글을 불러오지 못했습니다' });
    },
    createComment: async (postId: number | string, content: string, token: string): Promise<SuccessResponse<CommentType>> => {
        return request(`/api/v1/posts/${postId}/comments`, {
            method: 'POST', auth: 'required', token, json: { content }, errorMessage: '댓글 작성에 실패했습니다',
        });
    },
    deleteComment: async (postId: number | string, commentId: number, token: string): Promise<SuccessResponse<null>> => {
        return request(`/api/v1/posts/${postId}/comments/${commentId}`, {
            method: 'DELETE', auth: 'required', token, errorMessage: '댓글 삭제에 실패했습니다',
        });
    },
};
