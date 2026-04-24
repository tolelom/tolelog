import type { Post, Comment } from '../types';
import type { AuthContextType } from '../context/AuthContext';

export function makePost(overrides: Partial<Post> = {}): Post {
    return {
        id: 1,
        title: 'Hello',
        content: '# Hi\n\nhello world',
        user_id: 1,
        author: 'testuser',
        is_public: true,
        tags: '',
        view_count: 0,
        like_count: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

export function makeComment(overrides: Partial<Comment> = {}): Comment {
    return {
        id: 1,
        post_id: 1,
        user_id: 1,
        author: 'testuser',
        avatar_url: '',
        content: 'nice',
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

export function makeAuthValue(overrides: Partial<AuthContextType> = {}): AuthContextType {
    return {
        token: null,
        refreshToken: null,
        username: null,
        userId: null,
        avatarUrl: null,
        login: () => {},
        logout: () => {},
        setAvatarUrl: () => {},
        ...overrides,
    };
}
