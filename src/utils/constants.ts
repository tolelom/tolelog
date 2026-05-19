export const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// 프론트엔드 사이트 URL — canonical/og:url 등 SEO 메타에 사용. 끝의 슬래시는 제외.
export const SITE_URL: string = import.meta.env.VITE_SITE_URL || 'https://blog.tolelom.xyz';
export const SITE_NAME: string = 'Tolelog';
export const SITE_DESCRIPTION: string = 'Tolelog - 마크다운 블로그 플랫폼';

export const STORAGE_KEYS = {
    TOKEN: 'token',
    REFRESH_TOKEN: 'refresh_token',
    USER: 'user',
    DRAFT: 'tolelog_draft',
    DRAFT_EDIT: 'tolelog_draft_edit',
    THEME: 'tolelog_theme',
} as const;

export const AUTO_SAVE_DELAY_MS: number = 1000;

// 블로그 소유자 ID (홈페이지 시리즈 표시에 사용)
export const BLOG_OWNER_ID: number = 1;

export const IMAGE_CONSTRAINTS = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const,
    MAX_WIDTH: 1200,
    QUALITY: 0.8,
} as const;
