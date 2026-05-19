// 백엔드 internal/utils/slug.go 의 Slugify 와 동일한 알고리즘.
// 둘이 어긋나면 prerender URL 과 클라이언트 생성 URL 이 어긋나서 canonical 불일치가 발생.

const SLUG_MAX_RUNES = 60;

export function slugify(title: string): string {
    if (!title) return '';

    let out = '';
    let lastWasHyphen = false;

    for (const ch of title.trim()) {
        if (isLetterOrDigit(ch)) {
            out += ch.toLowerCase();
            lastWasHyphen = false;
        } else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '_' || ch === '-') {
            if (out.length > 0 && !lastWasHyphen) {
                out += '-';
                lastWasHyphen = true;
            }
        }
    }

    // 끝의 하이픈 제거
    out = out.replace(/-+$/, '');

    // 룬(코드 포인트) 단위 truncation
    const runes = Array.from(out);
    if (runes.length > SLUG_MAX_RUNES) {
        out = runes.slice(0, SLUG_MAX_RUNES).join('').replace(/-+$/, '');
    }
    return out;
}

/**
 * 게시글의 canonical URL 경로(`/post/{slug}-{id}`)를 반환한다.
 * 슬러그가 비어있으면 `/post/{id}` 형태로 폴백.
 */
export function postPath(post: { id: number; title: string }): string {
    const slug = slugify(post.title);
    if (!slug) return `/post/${post.id}`;
    return `/post/${slug}-${post.id}`;
}

/**
 * URL 의 `:postId` 세그먼트에서 게시글 ID 를 추출한다.
 * 지원 형태:
 *   - `"123"` → id=123, slug=undefined
 *   - `"hello-world-123"` → id=123, slug="hello-world"
 * 매칭 실패 시 null.
 */
export function parsePostSlugId(slugAndId: string | undefined): { id: number; slug?: string } | null {
    if (!slugAndId) return null;
    const match = slugAndId.match(/^(?:(.+)-)?(\d+)$/);
    if (!match) return null;
    const id = parseInt(match[2], 10);
    if (Number.isNaN(id) || id <= 0) return null;
    return match[1] ? { id, slug: match[1] } : { id };
}

// 내부: 한 문자가 letter 또는 digit 인지 검사. JS 의 정규식 \p{L}\p{N} 을 룬 단위로 사용.
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
function isLetterOrDigit(ch: string): boolean {
    return LETTER_OR_DIGIT.test(ch);
}
