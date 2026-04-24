import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import EditorPage from '../EditorPage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makePost } from '../../test-utils/fixtures';
import { POST_API, SERIES_API, TAG_API } from '../../utils/api';
import { AUTO_SAVE_DELAY_MS, STORAGE_KEYS } from '../../utils/constants';

const mockNavigate = vi.fn();
let mockUseParams: () => Record<string, string | undefined> = () => ({});

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => mockUseParams(),
    };
});

vi.mock('../../utils/api', () => ({
    POST_API: {
        getPost: vi.fn(),
        createPost: vi.fn(),
        updatePost: vi.fn(),
        createDraft: vi.fn(),
        saveDraft: vi.fn(),
    },
    SERIES_API: {
        getUserSeries: vi.fn(),
        addPost: vi.fn(),
    },
    TAG_API: {
        getTags: vi.fn(),
    },
}));

vi.mock('../../utils/apiCache', () => ({
    invalidateCache: vi.fn(),
}));

const mockGetPost = vi.mocked(POST_API.getPost);
const mockCreatePost = vi.mocked(POST_API.createPost);
const mockUpdatePost = vi.mocked(POST_API.updatePost);
const mockGetUserSeries = vi.mocked(SERIES_API.getUserSeries);
const mockGetTags = vi.mocked(TAG_API.getTags);

/**
 * Click a BlockEditor block div to activate it, then wait for the textarea to appear,
 * and change its value. Returns the textarea element (or null if not found).
 */
async function typeBlockContent(text: string): Promise<HTMLTextAreaElement | null> {
    // Inactive block renders as div.block-rendered; click to activate
    const blockDiv = document.querySelector('.block-rendered');
    if (blockDiv) {
        fireEvent.click(blockDiv);
    } else {
        // No rendered block yet — click the empty area to create one
        const emptyArea = document.querySelector('.block-empty-area');
        if (emptyArea) fireEvent.click(emptyArea);
    }
    // Wait for the textarea to appear after state update
    let blockTextarea: HTMLTextAreaElement | null = null;
    await waitFor(() => {
        blockTextarea = document.querySelector('textarea.block-textarea');
        if (!blockTextarea) throw new Error('block-textarea not found');
    });
    if (blockTextarea) {
        fireEvent.change(blockTextarea, { target: { value: text } });
    }
    return blockTextarea;
}

describe('EditorPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockReset();
        mockUseParams = () => ({});
        mockGetUserSeries.mockResolvedValue({ status: 'success', data: [] });
        mockGetTags.mockResolvedValue({ status: 'success', data: [] });
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('new 모드: title/content 비어 있고 prefill 없음', async () => {
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const titleInput = await screen.findByPlaceholderText(/제목/);
        expect((titleInput as HTMLInputElement).value).toBe('');
    });

    it('edit 모드: 기존 글을 prefill한다', async () => {
        mockUseParams = () => ({ postId: '5' });
        mockGetPost.mockResolvedValueOnce({
            status: 'success',
            data: makePost({ id: 5, title: '기존 제목', content: '기존 본문', user_id: 42 }),
        });
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByDisplayValue('기존 제목');
        expect(title).toBeInTheDocument();
    });

    it('저장 성공 시 toast.success 표시 후 /post/:id로 navigate', async () => {
        mockCreatePost.mockResolvedValueOnce({ status: 'success', data: { id: 101 } } as any);

        // Render first with real timers so the component settles
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });

        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '새 글' } });

        await typeBlockContent('본문 내용');

        // Switch to fake timers to control the 1500ms navigate delay
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        const saveBtn = screen.getByRole('button', { name: /글 발행|수정 완료/ });
        fireEvent.click(saveBtn);

        // runAllTimersAsync flushes both timers and promise microtasks
        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(mockCreatePost).toHaveBeenCalled();
        expect(screen.getByText('글이 저장되었습니다!')).toBeInTheDocument();
        expect(mockNavigate).toHaveBeenCalledWith('/post/101');
    });

    it('저장 실패 (non-401) 시 inline error + toast.error', async () => {
        mockCreatePost.mockRejectedValueOnce(new Error('서버 오류'));
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '글' } });

        await typeBlockContent('내용');

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /글 발행|수정 완료/ }));
        });

        await waitFor(() => expect(mockCreatePost).toHaveBeenCalled());
        expect(await screen.findAllByText(/서버 오류/)).not.toHaveLength(0);
    });

    it('저장 401 시 /login으로 navigate (EditorPage는 별도 toast를 띄우지 않음)', async () => {
        const err: Error & { status?: number } = new Error('인증 만료');
        err.status = 401;
        mockCreatePost.mockRejectedValueOnce(err);

        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '글' } });

        await typeBlockContent('내용');

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /글 발행|수정 완료/ }));
        });

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
    });

    it('비공개 토글 후 저장 시 is_public=false가 전송된다', async () => {
        mockCreatePost.mockResolvedValueOnce({ status: 'success', data: { id: 1 } } as any);
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '글' } });

        await typeBlockContent('내용');

        const privateToggle = document.querySelector('input[name="is_public"]') as HTMLInputElement;
        fireEvent.click(privateToggle);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /글 발행|수정 완료/ }));
        });
        await waitFor(() => expect(mockCreatePost).toHaveBeenCalled());
        const callArgs = mockCreatePost.mock.calls[0];
        // createPost signature: (title, content, is_public, token, tags)
        expect(callArgs[2]).toBe(false);
    });

    it('getUserSeries 응답이 시리즈 셀렉트에 렌더된다', async () => {
        mockGetUserSeries.mockResolvedValueOnce({
            status: 'success',
            data: [
                { id: 11, title: '시리즈1', user_id: 42, author: 'me', post_count: 3, description: '', created_at: '', updated_at: '' },
                { id: 22, title: '시리즈2', user_id: 42, author: 'me', post_count: 1, description: '', created_at: '', updated_at: '' },
            ],
        });
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        await screen.findByText('시리즈1');
        expect(screen.getByText('시리즈2')).toBeInTheDocument();
    });

    it('자동저장: 타이핑 후 AUTO_SAVE_DELAY_MS 경과 시 localStorage draft 생성', async () => {
        // Render first with real timers so component mounts fully
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByPlaceholderText(/제목/);

        // Switch to fake timers after initial render
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

        fireEvent.change(title, { target: { value: '자동저장 제목' } });

        act(() => { vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS + 10); });

        const saved = localStorage.getItem(STORAGE_KEYS.DRAFT);
        expect(saved).not.toBeNull();
        expect(saved!).toContain('자동저장 제목');
    });

    it('저장 성공 후 clearDraft로 localStorage draft가 비워진다', async () => {
        mockCreatePost.mockResolvedValueOnce({ status: 'success', data: { id: 5 } } as any);

        // Render with real timers so component settles
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '임시' } });

        await typeBlockContent('본문');

        // Switch to fake timers to control auto-save timing
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });

        // Trigger title change again to re-arm the debounce with fake timers
        fireEvent.change(title, { target: { value: '임시 글' } });
        act(() => { vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS + 10); });
        expect(localStorage.getItem(STORAGE_KEYS.DRAFT)).not.toBeNull();

        // Now save the post
        vi.useRealTimers();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /글 발행|수정 완료/ }));
        });
        await waitFor(() => expect(mockCreatePost).toHaveBeenCalled());

        await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.DRAFT)).toBeNull());
    });
});

// Suppress unused import warning — mockUpdatePost is declared for completeness
void mockUpdatePost;
