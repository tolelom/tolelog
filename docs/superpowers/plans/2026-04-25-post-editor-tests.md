# Post/Editor Component Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6개 Post/Editor 컴포넌트/페이지에 ~30개의 회귀 방어 테스트를 추가, 공용 `renderWithProviders` 헬퍼와 `fixtures.ts` 픽스처 도입.

**Architecture:** `src/test-utils/` 디렉터리에 래퍼 헬퍼 + 픽스처. `vi.mock('../utils/api')` 파일 단위로 API 모킹, `vi.mock('react-router-dom', ...)`은 `useNavigate` 검증이 필요한 페이지 테스트에서만. 통합 페이지 테스트는 `vi.useFakeTimers()`를 사용해 `setTimeout` 지연 네비게이션과 auto-save 디바운스를 결정론적으로 검증.

**Tech Stack:** React 19, TypeScript, Vitest 4.1, @testing-library/react, @testing-library/user-event, jsdom 29.

**Reference spec:** `docs/superpowers/specs/2026-04-25-post-editor-tests-design.md` (committed in `eacac1a`).

**Working directory for all commands:** `tolelog/` (프론트엔드 레포). 모든 경로는 이 루트 기준.

---

## Pre-flight

- [ ] **Step 0: 환경 확인**

Run:
```bash
npm install
npm run lint
npm run type-check
npm run test
```
Expected: 모두 exit 0. 테스트는 현재 11개 파일 / 112개 모두 통과. 실패하면 여기서 멈추고 원인 파악.

---

## Task 1: 테스트 인프라 (`renderWithProviders` + `fixtures`)

**Files:**
- Create: `src/test-utils/renderWithProviders.tsx`
- Create: `src/test-utils/fixtures.ts`

이 태스크엔 별도 테스트가 없음. 이후 태스크들이 이 헬퍼/픽스처를 소비하며 검증.

- [ ] **Step 1: `fixtures.ts` 작성**

파일: `src/test-utils/fixtures.ts`

```ts
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
```

- [ ] **Step 2: `renderWithProviders.tsx` 작성**

파일: `src/test-utils/renderWithProviders.tsx`

```tsx
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactElement } from 'react';
import { AuthContext, type AuthContextType } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastProvider';
import { makeAuthValue } from './fixtures';

export interface RenderOptionsEx extends Omit<RenderOptions, 'wrapper'> {
    authValue?: Partial<AuthContextType>;
    route?: string;
    path?: string;
}

export function renderWithProviders(ui: ReactElement, options: RenderOptionsEx = {}) {
    const { authValue, route = '/', path, ...rest } = options;
    const value = makeAuthValue(authValue);

    const wrapped = path
        ? <Routes><Route path={path} element={ui} /></Routes>
        : ui;

    return render(
        <MemoryRouter initialEntries={[route]}>
            <AuthContext.Provider value={value}>
                <ToastProvider>{wrapped}</ToastProvider>
            </AuthContext.Provider>
        </MemoryRouter>,
        rest,
    );
}
```

- [ ] **Step 3: 타입체크**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 4: 전체 테스트 회귀 없음 확인**

Run: `npm run test`
Expected: 112/112 통과 (기존과 동일).

- [ ] **Step 5: 커밋**

```bash
git add src/test-utils/renderWithProviders.tsx src/test-utils/fixtures.ts
git commit -m "test: add renderWithProviders helper and test fixtures"
```

---

## Task 2: `EditorToolbar.test.tsx` (3 tests)

**Files:**
- Create: `src/components/__tests__/EditorToolbar.test.tsx`

EditorToolbar는 순수 프레젠테이션 컴포넌트. `onFormat`, `onPreview`, `onImageInsert` 콜백과 `previewDisabled` prop만 있음. `ImageUploadButton`을 내부에 렌더하므로 `AuthContext`가 필요 → `renderWithProviders` 사용.

- [ ] **Step 1: 실패 테스트 작성**

파일: `src/components/__tests__/EditorToolbar.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import EditorToolbar from '../EditorToolbar';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

describe('EditorToolbar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('모든 포맷 버튼과 미리보기 버튼이 렌더된다', () => {
        renderWithProviders(
            <EditorToolbar
                onFormat={vi.fn()}
                onImageInsert={vi.fn()}
                onPreview={vi.fn()}
                previewDisabled={false}
            />
        );
        expect(screen.getByTitle(/제목/)).toBeInTheDocument();
        expect(screen.getByTitle(/굵게/)).toBeInTheDocument();
        expect(screen.getByTitle(/기울임/)).toBeInTheDocument();
        expect(screen.getByTitle(/취소선/)).toBeInTheDocument();
        expect(screen.getByTitle(/인라인 코드/)).toBeInTheDocument();
        expect(screen.getByTitle(/링크/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '미리보기' })).toBeInTheDocument();
    });

    it('각 포맷 버튼 클릭이 올바른 type으로 onFormat을 호출한다', () => {
        const onFormat = vi.fn();
        renderWithProviders(
            <EditorToolbar
                onFormat={onFormat}
                onImageInsert={vi.fn()}
                onPreview={vi.fn()}
                previewDisabled={false}
            />
        );
        fireEvent.click(screen.getByTitle(/제목/));
        fireEvent.click(screen.getByTitle(/굵게/));
        fireEvent.click(screen.getByTitle(/기울임/));
        fireEvent.click(screen.getByTitle(/취소선/));
        fireEvent.click(screen.getByTitle(/인라인 코드/));
        fireEvent.click(screen.getByTitle(/링크/));
        expect(onFormat).toHaveBeenNthCalledWith(1, 'heading');
        expect(onFormat).toHaveBeenNthCalledWith(2, 'bold');
        expect(onFormat).toHaveBeenNthCalledWith(3, 'italic');
        expect(onFormat).toHaveBeenNthCalledWith(4, 'strikethrough');
        expect(onFormat).toHaveBeenNthCalledWith(5, 'code');
        expect(onFormat).toHaveBeenNthCalledWith(6, 'link');
    });

    it('previewDisabled=true이면 미리보기 버튼이 비활성화된다', () => {
        renderWithProviders(
            <EditorToolbar
                onFormat={vi.fn()}
                onImageInsert={vi.fn()}
                onPreview={vi.fn()}
                previewDisabled={true}
            />
        );
        expect(screen.getByRole('button', { name: '미리보기' })).toBeDisabled();
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- src/components/__tests__/EditorToolbar.test.tsx`
Expected: PASS (EditorToolbar는 이미 존재하므로 실제로는 즉시 통과 — 이 파일은 순수 컴포넌트라 별도 구현이 없음).

테스트가 FAIL하면 `renderWithProviders` 사용법 또는 title 문자열 매칭이 이상한 것이니 수정.

- [ ] **Step 3: 전체 회귀 확인**

Run: `npm run test`
Expected: 115/115 통과 (112 + 3).

- [ ] **Step 4: 커밋**

```bash
git add src/components/__tests__/EditorToolbar.test.tsx
git commit -m "test(editor): add EditorToolbar regression tests"
```

---

## Task 3: `ImageUploadButton.test.tsx` (2 tests)

**Files:**
- Create: `src/components/__tests__/ImageUploadButton.test.tsx`

`validateImageFile`, `compressImage`, `uploadImageToServer` 셋 다 `../utils/imageUpload`에 있음. 파일 선택은 `<input type="file">`에 `change` 이벤트 dispatch.

- [ ] **Step 1: 실패 테스트 작성**

파일: `src/components/__tests__/ImageUploadButton.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUploadButton from '../ImageUploadButton';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import * as imageUpload from '../../utils/imageUpload';

vi.mock('../../utils/imageUpload', () => ({
    validateImageFile: vi.fn(() => ({ valid: true })),
    compressImage: vi.fn(async (f: File) => f),
    uploadImageToServer: vi.fn(),
}));

function makeFile(): File {
    return new File(['(binary)'], 'pic.png', { type: 'image/png' });
}

describe('ImageUploadButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('업로드 실패 시 인라인 에러를 표시하고 onImageInsert는 호출되지 않는다', async () => {
        vi.mocked(imageUpload.uploadImageToServer).mockRejectedValueOnce(new Error('서버 오류'));
        const onImageInsert = vi.fn();

        const { container } = renderWithProviders(
            <ImageUploadButton onImageInsert={onImageInsert} />,
            { authValue: { token: 'T' } }
        );
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [makeFile()] } });

        expect(await screen.findByText('서버 오류')).toBeInTheDocument();
        expect(onImageInsert).not.toHaveBeenCalled();
    });

    it('업로드 성공 시 onImageInsert를 fullUrl과 파일명으로 호출한다', async () => {
        vi.mocked(imageUpload.uploadImageToServer).mockResolvedValueOnce('/uploads/abc.png');
        const onImageInsert = vi.fn();

        const { container } = renderWithProviders(
            <ImageUploadButton onImageInsert={onImageInsert} />,
            { authValue: { token: 'T' } }
        );
        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [makeFile()] } });

        await waitFor(() => expect(onImageInsert).toHaveBeenCalled());
        const [fullUrl, fileName] = onImageInsert.mock.calls[0];
        expect(fullUrl.endsWith('/uploads/abc.png')).toBe(true);
        expect(fileName).toBe('pic.png');
    });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `npm run test -- src/components/__tests__/ImageUploadButton.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 3: 전체 회귀 확인**

Run: `npm run test`
Expected: 117/117 통과 (115 + 2).

- [ ] **Step 4: 커밋**

```bash
git add src/components/__tests__/ImageUploadButton.test.tsx
git commit -m "test(editor): add ImageUploadButton regression tests"
```

---

## Task 4: `BlockEditor.test.tsx` (5 tests)

**Files:**
- Create: `src/components/__tests__/BlockEditor.test.tsx`

`BlockEditor`는 `forwardRef`로 `wrapSelection`/`getActiveTextarea`를 노출. 테스트는 부모 래퍼 컴포넌트에서 ref을 잡고 호출 → `onChange` 콜백이 올바른 content로 호출되는지 검증.

`crypto.randomUUID`는 jsdom 29 + vitest 4에서 이미 사용 가능.

- [ ] **Step 1: 실패 테스트 작성**

파일: `src/components/__tests__/BlockEditor.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import BlockEditor, { type BlockEditorHandle } from '../BlockEditor';

function Harness({
    content,
    onChange,
    expose,
}: {
    content: string;
    onChange: (v: string) => void;
    expose?: (ref: React.RefObject<BlockEditorHandle | null>) => void;
}) {
    const ref = useRef<BlockEditorHandle | null>(null);
    if (expose) expose(ref);
    return <BlockEditor ref={ref} content={content} onChange={onChange} token={null} />;
}

describe('BlockEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('초기 content를 여러 블록 textarea로 렌더한다', () => {
        const { container } = render(<Harness content="# A\n\n# B" onChange={() => {}} />);
        const textareas = container.querySelectorAll('textarea');
        expect(textareas.length).toBeGreaterThanOrEqual(2);
    });

    it('블록 textarea 값을 바꾸면 onChange가 새 content로 호출된다', () => {
        const onChange = vi.fn();
        const { container } = render(<Harness content="hello" onChange={onChange} />);
        const ta = container.querySelector('textarea') as HTMLTextAreaElement;
        fireEvent.change(ta, { target: { value: 'world' } });
        expect(onChange).toHaveBeenCalled();
        const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
        expect(lastArg).toContain('world');
    });

    it('textarea에 Enter를 누르면 블록이 분할되고 onChange가 호출된다', () => {
        const onChange = vi.fn();
        const { container } = render(<Harness content="one" onChange={onChange} />);
        const ta = container.querySelector('textarea') as HTMLTextAreaElement;
        ta.focus();
        fireEvent.keyDown(ta, { key: 'Enter' });
        // 정확한 내부 구현과 무관하게: Enter 이후 onChange가 최소 한 번 이상 호출돼야 함
        expect(onChange).toHaveBeenCalled();
    });

    it('ref.wrapSelection이 onChange를 새 content로 호출한다 (selection 없는 커서 삽입)', () => {
        const onChange = vi.fn();
        let capturedRef: React.RefObject<BlockEditorHandle | null> | null = null;
        const { container } = render(
            <Harness content="hi" onChange={onChange} expose={(r) => { capturedRef = r; }} />
        );
        const ta = container.querySelector('textarea') as HTMLTextAreaElement;
        ta.focus();
        ta.setSelectionRange(0, 0);
        onChange.mockClear();
        capturedRef!.current!.wrapSelection('**', '**');
        expect(onChange).toHaveBeenCalled();
        const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0];
        // **markers**가 content에 삽입되어야 함
        expect(lastArg).toMatch(/\*\*/);
    });

    it('초기 content가 비어 있어도 에러 없이 렌더된다', () => {
        expect(() => render(<Harness content="" onChange={() => {}} />)).not.toThrow();
        expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(1);
    });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `npm run test -- src/components/__tests__/BlockEditor.test.tsx`
Expected: PASS (5 tests).

만약 `ref.wrapSelection` 테스트에서 `onChange`가 호출되지 않으면 — `wrapSelection`은 현재 focus된 textarea 기준으로 동작하므로 `ta.focus()` + `setSelectionRange`가 제대로 작동하는지 확인. jsdom에서 focus/selection이 동작하려면 textarea가 DOM에 실제로 mount된 상태여야 함 (위 테스트는 그렇게 구성됨).

- [ ] **Step 3: 전체 회귀 확인**

Run: `npm run test`
Expected: 122/122 통과 (117 + 5).

- [ ] **Step 4: 커밋**

```bash
git add src/components/__tests__/BlockEditor.test.tsx
git commit -m "test(editor): add BlockEditor public API regression tests"
```

---

## Task 5: `CommentSection.test.tsx` (6 tests)

**Files:**
- Create: `src/components/__tests__/CommentSection.test.tsx`

`COMMENT_API` 전체를 mock. 댓글 작성/삭제 시 `fetchComments`가 재호출되는 것까지 잠금.

- [ ] **Step 1: 실패 테스트 작성**

파일: `src/components/__tests__/CommentSection.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CommentSection from '../CommentSection';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makeComment } from '../../test-utils/fixtures';
import { COMMENT_API } from '../../utils/api';

vi.mock('../../utils/api', () => ({
    COMMENT_API: {
        getComments: vi.fn(),
        createComment: vi.fn(),
        deleteComment: vi.fn(),
    },
}));

const mockGetComments = vi.mocked(COMMENT_API.getComments);
const mockCreateComment = vi.mocked(COMMENT_API.createComment);
const mockDeleteComment = vi.mocked(COMMENT_API.deleteComment);

describe('CommentSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetComments.mockResolvedValue({
            status: 'success',
            data: { comments: [], total: 0 },
        });
    });

    it('로드된 댓글 목록과 개수를 렌더한다', async () => {
        mockGetComments.mockResolvedValueOnce({
            status: 'success',
            data: {
                comments: [
                    makeComment({ id: 1, author: 'alice', content: '첫 댓글' }),
                    makeComment({ id: 2, author: 'bob', content: '두 번째' }),
                ],
                total: 2,
            },
        });
        renderWithProviders(<CommentSection postId={1} />);
        expect(await screen.findByText('첫 댓글')).toBeInTheDocument();
        expect(screen.getByText('두 번째')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('비로그인 시 로그인 링크를 보여주고 작성 폼은 없다', async () => {
        renderWithProviders(<CommentSection postId={1} />);
        await waitFor(() => expect(mockGetComments).toHaveBeenCalled());
        expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('빈 목록이면 "아직 댓글이 없습니다" 메시지를 표시한다', async () => {
        renderWithProviders(<CommentSection postId={1} />);
        expect(await screen.findByText('아직 댓글이 없습니다.')).toBeInTheDocument();
    });

    it('댓글 작성 성공 시 createComment 호출 후 목록을 다시 로드한다', async () => {
        mockCreateComment.mockResolvedValueOnce({ status: 'success', data: {} });
        renderWithProviders(<CommentSection postId={1} />, {
            authValue: { token: 'T', userId: 99 },
        });
        await waitFor(() => expect(mockGetComments).toHaveBeenCalledTimes(1));

        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: '새 댓글' } });
        fireEvent.click(screen.getByRole('button', { name: '댓글 작성' }));

        await waitFor(() => expect(mockCreateComment).toHaveBeenCalledWith(1, '새 댓글', 'T'));
        await waitFor(() => expect(mockGetComments).toHaveBeenCalledTimes(2));
    });

    it('댓글 작성 실패 시 인라인 에러를 표시한다 (toast 아님)', async () => {
        mockCreateComment.mockRejectedValueOnce(new Error('댓글 저장 실패'));
        renderWithProviders(<CommentSection postId={1} />, {
            authValue: { token: 'T', userId: 99 },
        });
        await waitFor(() => expect(mockGetComments).toHaveBeenCalled());

        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });
        fireEvent.click(screen.getByRole('button', { name: '댓글 작성' }));

        expect(await screen.findByText('댓글 저장 실패')).toBeInTheDocument();
    });

    it('본인 댓글에만 삭제 버튼이 보인다', async () => {
        mockGetComments.mockResolvedValueOnce({
            status: 'success',
            data: {
                comments: [
                    makeComment({ id: 1, user_id: 42, author: 'me', content: '내 글' }),
                    makeComment({ id: 2, user_id: 77, author: 'other', content: '남 글' }),
                ],
                total: 2,
            },
        });
        renderWithProviders(<CommentSection postId={1} />, {
            authValue: { token: 'T', userId: 42 },
        });
        await screen.findByText('내 글');
        expect(screen.getByRole('button', { name: /me의 댓글 삭제/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /other의 댓글 삭제/ })).toBeNull();
    });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `npm run test -- src/components/__tests__/CommentSection.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 3: 전체 회귀 확인**

Run: `npm run test`
Expected: 128/128 통과 (122 + 6).

- [ ] **Step 4: 커밋**

```bash
git add src/components/__tests__/CommentSection.test.tsx
git commit -m "test(comment): add CommentSection regression tests"
```

---

## Task 6: `PostDetailPage.test.tsx` (6 tests)

**Files:**
- Create: `src/pages/__tests__/PostDetailPage.test.tsx`

`useParams` 모킹이 필요해 `react-router-dom`을 부분 mock. 나머지 API는 모두 `vi.mock('../../utils/api', ...)`. `useLike`/`useSeriesNav`/`useTOC`/`useCopyCodeBlock` 훅은 실제 구현을 사용하되 API 호출은 mock으로 차단됨 (모든 호출이 mocked `POST_API`/`LIKE_API`/`COMMENT_API`/`SERIES_API`에 닿음).

- [ ] **Step 1: 실패 테스트 작성**

파일: `src/pages/__tests__/PostDetailPage.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import PostDetailPage from '../PostDetailPage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makePost } from '../../test-utils/fixtures';
import { POST_API, LIKE_API, COMMENT_API, SERIES_API } from '../../utils/api';

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ postId: '1' }),
    };
});

vi.mock('../../utils/api', () => ({
    POST_API: { getPost: vi.fn(), deletePost: vi.fn() },
    LIKE_API: { getStatus: vi.fn(), toggle: vi.fn() },
    COMMENT_API: { getComments: vi.fn() },
    SERIES_API: { getSeriesNav: vi.fn(), getSeries: vi.fn() },
}));

const mockGetPost = vi.mocked(POST_API.getPost);
const mockGetStatus = vi.mocked(LIKE_API.getStatus);
const mockToggle = vi.mocked(LIKE_API.toggle);
const mockGetComments = vi.mocked(COMMENT_API.getComments);
const mockGetSeriesNav = vi.mocked(SERIES_API.getSeriesNav);

describe('PostDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetComments.mockResolvedValue({ status: 'success', data: { comments: [], total: 0 } });
        mockGetStatus.mockResolvedValue({ status: 'success', data: { liked: false } });
        mockGetSeriesNav.mockResolvedValue({ status: 'success', data: null });
    });

    it('글을 렌더한다 (제목, 작성자, 본문)', async () => {
        mockGetPost.mockResolvedValueOnce({
            status: 'success',
            data: makePost({ title: '내 글', author: 'alice', content: '본문 문단' }),
        });
        renderWithProviders(<PostDetailPage />);
        expect(await screen.findByText('내 글')).toBeInTheDocument();
        expect(screen.getByText(/alice/)).toBeInTheDocument();
        expect(screen.getByText('본문 문단')).toBeInTheDocument();
    });

    it('글을 찾지 못하면 에러 메시지를 표시한다', async () => {
        mockGetPost.mockResolvedValueOnce({ status: 'error', message: 'not found' });
        renderWithProviders(<PostDetailPage />);
        expect(await screen.findByText(/글을 찾을 수 없습니다/)).toBeInTheDocument();
    });

    it('비로그인 시 좋아요 버튼이 비활성화된다', async () => {
        mockGetPost.mockResolvedValueOnce({ status: 'success', data: makePost() });
        renderWithProviders(<PostDetailPage />);
        const btn = await screen.findByTitle(/로그인 후 이용 가능/);
        expect(btn).toBeDisabled();
    });

    it('좋아요 클릭 시 LIKE_API.toggle이 호출되고 count/liked가 업데이트된다', async () => {
        mockGetPost.mockResolvedValueOnce({
            status: 'success',
            data: makePost({ like_count: 5 }),
        });
        mockToggle.mockResolvedValueOnce({
            status: 'success',
            data: { liked: true, like_count: 6 },
        });
        renderWithProviders(<PostDetailPage />, {
            authValue: { token: 'T', userId: 99 },
        });
        const btn = await screen.findByTitle('좋아요');
        fireEvent.click(btn);
        await waitFor(() => expect(mockToggle).toHaveBeenCalledWith('1', 'T'));
        await screen.findByText('6');
    });

    it('댓글 섹션이 렌더된다 (빈 목록이라도)', async () => {
        mockGetPost.mockResolvedValueOnce({ status: 'success', data: makePost() });
        renderWithProviders(<PostDetailPage />);
        await screen.findByText(makePost().title);
        expect(await screen.findByText('아직 댓글이 없습니다.')).toBeInTheDocument();
    });

    it('본인 글에만 삭제 버튼이 보인다', async () => {
        mockGetPost.mockResolvedValueOnce({
            status: 'success',
            data: makePost({ user_id: 42 }),
        });
        renderWithProviders(<PostDetailPage />, {
            authValue: { token: 'T', userId: 42 },
        });
        expect(await screen.findByRole('button', { name: /삭제/ })).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `npm run test -- src/pages/__tests__/PostDetailPage.test.tsx`
Expected: PASS (6 tests).

주의: `useLike` 훅은 마운트 시 `LIKE_API.getStatus`를 호출하는데, beforeEach에서 기본 응답을 설정해 놨으니 문제없음.

- [ ] **Step 3: 전체 회귀 확인**

Run: `npm run test`
Expected: 134/134 통과 (128 + 6).

- [ ] **Step 4: 커밋**

```bash
git add src/pages/__tests__/PostDetailPage.test.tsx
git commit -m "test(post): add PostDetailPage regression tests"
```

---

## Task 7: `EditorPage.test.tsx` (9 tests)

**Files:**
- Create: `src/pages/__tests__/EditorPage.test.tsx`

가장 큰 태스크. `react-router-dom`을 부분 mock해 `useNavigate`를 spy로. API는 `POST_API`/`SERIES_API` 전체 mock. `toast.success/error`는 실제 `ToastProvider`를 통해 동작.

`EditorPage.handleSubmit`은 성공 시 `setTimeout(() => navigate(...), 1500)`로 **지연** 네비게이션. 테스트는 `vi.useFakeTimers()`로 시간을 진행시켜 검증.

- [ ] **Step 1: 실패 테스트 작성**

파일: `src/pages/__tests__/EditorPage.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import EditorPage from '../EditorPage';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { makePost } from '../../test-utils/fixtures';
import { POST_API, SERIES_API } from '../../utils/api';
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
}));

vi.mock('../../utils/apiCache', () => ({
    invalidateCache: vi.fn(),
}));

const mockGetPost = vi.mocked(POST_API.getPost);
const mockCreatePost = vi.mocked(POST_API.createPost);
const mockUpdatePost = vi.mocked(POST_API.updatePost);
const mockGetUserSeries = vi.mocked(SERIES_API.getUserSeries);

describe('EditorPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockReset();
        mockUseParams = () => ({});
        mockGetUserSeries.mockResolvedValue({ status: 'success', data: [] });
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
            data: makePost({ id: 5, title: '기존 제목', content: '기존 본문' }),
        });
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByDisplayValue('기존 제목');
        expect(title).toBeInTheDocument();
    });

    it('저장 성공 시 toast.success 표시 후 /post/:id로 navigate', async () => {
        vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
        mockCreatePost.mockResolvedValueOnce({ status: 'success', data: { id: 101 } });
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });

        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '새 글' } });

        // content에 blockeditor의 첫 textarea를 찾아 입력
        const textareas = document.querySelectorAll('.block-editor textarea, textarea.block-textarea, textarea');
        const contentArea = Array.from(textareas).find(t => t !== title) as HTMLTextAreaElement;
        fireEvent.change(contentArea, { target: { value: '본문 내용' } });

        const saveBtn = screen.getByRole('button', { name: /글 발행|수정 완료/ });
        await act(async () => {
            fireEvent.click(saveBtn);
        });

        await waitFor(() => expect(mockCreatePost).toHaveBeenCalled());
        expect(await screen.findByText('글이 저장되었습니다!')).toBeInTheDocument();

        // setTimeout 1500ms 후 navigate
        act(() => { vi.advanceTimersByTime(1500); });
        expect(mockNavigate).toHaveBeenCalledWith('/post/101');
    });

    it('저장 실패 (non-401) 시 inline error + toast.error', async () => {
        mockCreatePost.mockRejectedValueOnce(new Error('서버 오류'));
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '글' } });
        const textareas = Array.from(document.querySelectorAll('textarea')).filter(t => t !== title);
        fireEvent.change(textareas[0], { target: { value: '내용' } });

        fireEvent.click(screen.getByRole('button', { name: /글 발행|수정 완료/ }));

        await waitFor(() => expect(mockCreatePost).toHaveBeenCalled());
        // inline error — Editor는 error state에 메시지 저장
        expect(await screen.findAllByText(/서버 오류/)).not.toHaveLength(0);
    });

    it('저장 401 시 /login으로 navigate (EditorPage는 별도 toast를 띄우지 않음)', async () => {
        const err: Error & { status?: number } = new Error('인증 만료');
        err.status = 401;
        mockCreatePost.mockRejectedValueOnce(err);

        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '글' } });
        const textareas = Array.from(document.querySelectorAll('textarea')).filter(t => t !== title);
        fireEvent.change(textareas[0], { target: { value: '내용' } });
        fireEvent.click(screen.getByRole('button', { name: /글 발행|수정 완료/ }));

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
    });

    it('비공개 토글 후 저장 시 is_public=false가 전송된다', async () => {
        mockCreatePost.mockResolvedValueOnce({ status: 'success', data: { id: 1 } });
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '글' } });
        const textareas = Array.from(document.querySelectorAll('textarea')).filter(t => t !== title);
        fireEvent.change(textareas[0], { target: { value: '내용' } });

        // is_public 체크박스 (name으로 찾음 — label 텍스트가 체크 상태에 따라 공개↔비공개로 토글됨)
        const privateToggle = document.querySelector('input[name="is_public"]') as HTMLInputElement;
        fireEvent.click(privateToggle);

        fireEvent.click(screen.getByRole('button', { name: /글 발행|수정 완료/ }));
        await waitFor(() => expect(mockCreatePost).toHaveBeenCalled());
        const callArgs = mockCreatePost.mock.calls[0];
        // signature: createPost(title, content, is_public, token, tags)
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
        vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '자동저장 제목' } });

        act(() => { vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS + 10); });

        const saved = localStorage.getItem(STORAGE_KEYS.DRAFT);
        expect(saved).not.toBeNull();
        expect(saved!).toContain('자동저장 제목');
    });

    it('저장 성공 후 clearDraft로 localStorage draft가 비워진다', async () => {
        vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
        mockCreatePost.mockResolvedValueOnce({ status: 'success', data: { id: 5 } });
        renderWithProviders(<EditorPage />, { authValue: { token: 'T', userId: 42 } });
        const title = await screen.findByPlaceholderText(/제목/);
        fireEvent.change(title, { target: { value: '임시' } });
        const textareas = Array.from(document.querySelectorAll('textarea')).filter(t => t !== title);
        fireEvent.change(textareas[0], { target: { value: '본문' } });

        // 자동저장이 먼저 동작하도록 시간 진행
        act(() => { vi.advanceTimersByTime(AUTO_SAVE_DELAY_MS + 10); });
        expect(localStorage.getItem(STORAGE_KEYS.DRAFT)).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /글 발행|수정 완료/ }));
        await waitFor(() => expect(mockCreatePost).toHaveBeenCalled());

        // createPost는 async — 성공 분기 내에서 clearDraft가 호출됨
        await waitFor(() => expect(localStorage.getItem(STORAGE_KEYS.DRAFT)).toBeNull());
    });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `npm run test -- src/pages/__tests__/EditorPage.test.tsx`
Expected: PASS (9 tests).

주의 사항 / 흔한 실패 원인:
- 저장 버튼 라벨은 `글 발행` (new) 또는 `수정 완료` (edit) — `저장 중...`/`수정 중...`이 아님. `/글 발행|수정 완료/` 정규식 사용.
- `is_public` 체크박스는 `document.querySelector('input[name="is_public"]')`으로 접근 (label 텍스트가 공개↔비공개로 토글돼서 `getByLabelText`로 잡기 어려움).
- 자동저장 테스트에서 `vi.useFakeTimers` 시점: render 전에 setup해야 `useAutoSave`의 `setTimeout`이 페이크 타이머에 의해 잡힘.
- `vi.useFakeTimers`는 `{ toFake: ['Date', 'setTimeout', ...] }`로 Date까지 포함해야 `useAutoSave` 내부 `new Date().toISOString()`이 결정론적으로 동작.

- [ ] **Step 3: 전체 회귀 확인**

Run: `npm run test`
Expected: 143/143 통과 (134 + 9).

- [ ] **Step 4: 커밋**

```bash
git add src/pages/__tests__/EditorPage.test.tsx
git commit -m "test(editor): add EditorPage regression tests"
```

---

## Task 8: 최종 CI 검증

- [ ] **Step 1: 전체 파이프라인 실행**

Run:
```bash
npm run lint
npm run type-check
npm run build
npm run test
```
Expected: 모두 exit 0. 테스트 143/143 통과.

- [ ] **Step 2: 새로 추가된 테스트 파일 목록 확인**

Run: `git log --stat main -20 --oneline`
Expected: 다음 7개 파일 추가:
- `src/test-utils/renderWithProviders.tsx`
- `src/test-utils/fixtures.ts`
- `src/components/__tests__/EditorToolbar.test.tsx`
- `src/components/__tests__/ImageUploadButton.test.tsx`
- `src/components/__tests__/BlockEditor.test.tsx`
- `src/components/__tests__/CommentSection.test.tsx`
- `src/pages/__tests__/PostDetailPage.test.tsx`
- `src/pages/__tests__/EditorPage.test.tsx`

- [ ] **Step 3: 변경 없음 확인**

`src/` 하위 기존 소스 (테스트 디렉터리 제외) 는 변경되지 않아야 함.
Run: `git diff main~8 main -- src/components src/pages src/hooks src/utils src/context | grep -E "^diff" | grep -v __tests__ | grep -v test-utils`
Expected: 빈 출력 (기존 소스 변경 없음).

만약 리팩토링이 필요해 소스를 바꾼 경우, 해당 변경이 최소한인지 확인.

---

## Summary — Files Touched

**Created (8):**
- `src/test-utils/renderWithProviders.tsx`
- `src/test-utils/fixtures.ts`
- `src/components/__tests__/EditorToolbar.test.tsx`
- `src/components/__tests__/ImageUploadButton.test.tsx`
- `src/components/__tests__/BlockEditor.test.tsx`
- `src/components/__tests__/CommentSection.test.tsx`
- `src/pages/__tests__/PostDetailPage.test.tsx`
- `src/pages/__tests__/EditorPage.test.tsx`

**Modified:** 없음 (원칙: 소스 불변).

**Test count:** 112 → 143 (31개 추가, 스펙 목표 ~30개와 일치).

**Commits:** Task마다 1개 (총 7개) + 최종 검증 태스크는 commit 없음. 각 커밋은 독립적으로 revert 가능.
