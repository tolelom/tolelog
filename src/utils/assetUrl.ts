import { API_BASE_URL } from './constants';

// 업로드 파일은 API 서버가 /uploads/... 경로로만 알려 주므로, 블로그 도메인에서 쓰려면 API 주소를 붙인다.
export function resolveAssetUrl(url: string): string {
    if (!url || /^(https?:|data:|blob:)/.test(url)) return url;
    return `${API_BASE_URL}${url}`;
}

// 본문 이미지는 블로그 자체 파일(/vite.svg 등)도 있을 수 있어 업로드 경로만 바꾼다.
export function resolveContentImageUrl(url: string): string {
    return url.startsWith('/uploads/') ? resolveAssetUrl(url) : url;
}
