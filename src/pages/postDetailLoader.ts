import type { LoaderFunctionArgs } from 'react-router-dom';
import type { PostListItem } from '../types';
import { parsePostSlugId } from '../utils/slug';
import { findPublicPostMeta } from '../utils/postMeta';

// prerender 때만 실행된다. 글 상세의 제목·설명·og 태그를 정적 HTML 에 넣는다(본문은 브라우저에서 그린다).
export async function loader({ params }: LoaderFunctionArgs): Promise<PostListItem | null> {
    const parsed = parsePostSlugId(params.postId);
    return parsed ? findPublicPostMeta(parsed.id) : null;
}
