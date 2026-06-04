import { API_BASE_URL } from '../constants';
import type { SuccessResponse, Comment as CommentType, CommentListResponse } from '../../types';

export const COMMENT_API = {
    getComments: async (postId: number | string, { signal }: { signal?: AbortSignal } = {}): Promise<SuccessResponse<CommentListResponse>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/comments`, { signal });
        if (!response.ok) throw new Error(`댓글을 불러오지 못했습니다 (${response.status})`);
        return response.json();
    },
    createComment: async (postId: number | string, content: string, token: string): Promise<SuccessResponse<CommentType>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ content }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || `댓글 작성에 실패했습니다`);
        }
        return response.json();
    },
    deleteComment: async (postId: number | string, commentId: number, token: string): Promise<SuccessResponse<null>> => {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || `댓글 삭제에 실패했습니다`);
        }
        if (response.status === 204) return { status: 'success', data: null };
        return response.json();
    },
};
