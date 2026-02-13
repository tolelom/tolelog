export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const STORAGE_KEYS = {
    TOKEN: 'token',
    USER: 'user',
    DRAFT: 'tolelog_draft',
    THEME: 'tolelog_theme',
};

export const AUTO_SAVE_DELAY_MS = 1000;

export const IMAGE_CONSTRAINTS = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    MAX_WIDTH: 1200,
    QUALITY: 0.8,
};
