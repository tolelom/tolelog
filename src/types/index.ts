// Shared type definitions based on backend API responses

export interface User {
    id: number;
    username: string;
    avatar_url: string;
    created_at: string;
    last_login: string;
}

export interface Post {
    id: number;
    title: string;
    content: string;
    user_id: number;
    author: string;
    is_public: boolean;
    tags: string;
    created_at: string;
    updated_at: string;
}

export interface PostListItem {
    id: number;
    title: string;
    user_id: number;
    author: string;
    is_public: boolean;
    tags: string;
    created_at: string;
    updated_at: string;
}

export interface Pagination {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
}

export interface AuthData {
    access_token: string;
    refresh_token: string;
    username: string;
    user_id: number;
    avatar_url: string;
}

export interface SuccessResponse<T> {
    status: string;
    data: T;
}

export interface ErrorResponse {
    status: string;
    error: string;
    message: string;
}

export interface PostListWithPagination {
    posts: PostListItem[];
    pagination: Pagination;
}

export interface Comment {
    id: number;
    post_id: number;
    user_id: number;
    author: string;
    avatar_url: string;
    content: string;
    created_at: string;
}

export interface CommentListResponse {
    comments: Comment[];
    total: number;
}

// Block types for markdown parser (discriminated union)

export interface HeadingBlock {
    type: 'heading';
    level: number;
    text: string;
    raw: string;
}

export interface ParagraphBlock {
    type: 'paragraph';
    text: string;
    raw: string;
}

export interface CodeBlock {
    type: 'code';
    lang: string;
    code: string;
    raw: string;
}

export interface MathBlock {
    type: 'math_block';
    expr: string;
    raw: string;
}

export interface BlockquoteBlock {
    type: 'blockquote';
    text: string;
    raw: string;
}

export interface ChecklistItem {
    checked: boolean;
    text: string;
}

export interface ChecklistBlock {
    type: 'checklist';
    items: ChecklistItem[];
    raw: string;
}

export interface UnorderedListBlock {
    type: 'unordered_list';
    items: string[];
    raw: string;
}

export interface OrderedListBlock {
    type: 'ordered_list';
    items: string[];
    raw: string;
}

export interface TableBlock {
    type: 'table';
    headers: string[];
    alignments: string[];
    rows: string[][];
    raw: string;
}

export interface HrBlock {
    type: 'hr';
    raw: string;
}

export interface ImageBlock {
    type: 'image';
    alt: string;
    src: string;
    width: string | null;
    raw: string;
}

export interface FootnoteDefBlock {
    type: 'footnote_def';
    id: string;
    text: string;
    raw: string;
}

export type Block =
    | HeadingBlock
    | ParagraphBlock
    | CodeBlock
    | MathBlock
    | BlockquoteBlock
    | ChecklistBlock
    | UnorderedListBlock
    | OrderedListBlock
    | TableBlock
    | HrBlock
    | ImageBlock
    | FootnoteDefBlock;

// Draft data for auto-save
export interface DraftData {
    title: string;
    content: string;
    is_public: boolean;
    tags: string;
    savedAt: string;
}

// Form data for post creation/editing
export interface PostFormData {
    title: string;
    content: string;
    is_public: boolean;
    tags: string;
}

// Image validation result
export interface ImageValidationResult {
    valid: boolean;
    error?: string;
}
