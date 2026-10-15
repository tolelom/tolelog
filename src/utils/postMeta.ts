import { API_BASE_URL } from './constants';
import type { PostListItem } from '../types';

let listPromise: Promise<PostListItem[]> | null = null;

// 빌드(prerender) 때 글 상세의 메타 태그를 채울 공개 글 목록. 글 상세 API 는 조회수를 올리므로 목록 API 를 쓴다.
async function fetchPublicPostList(): Promise<PostListItem[]> {
    const posts: PostListItem[] = [];
    for (let page = 1; page <= 50; page++) {
        const response = await fetch(`${API_BASE_URL}/api/v1/posts?page=${page}&page_size=100`);
        if (!response.ok) break;
        const body = await response.json();
        posts.push(...(body?.data?.posts ?? []));
        if (page >= (body?.data?.pagination?.total_pages ?? 0)) break;
    }
    return posts;
}

export async function findPublicPostMeta(postId: number): Promise<PostListItem | null> {
    listPromise ??= fetchPublicPostList().catch(() => []);
    const posts = await listPromise;
    return posts.find(p => p.id === postId) ?? null;
}
