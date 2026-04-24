# Post/Editor Component Tests — Design Spec

**Date**: 2026-04-25
**Status**: Approved, ready for implementation planning
**Scope**: `tolelog/` React frontend only

## 1. Goal & Context

Tolelog 프론트엔드의 Post/Editor 관련 핵심 컴포넌트에는 현재 테스트가 0개입니다. 최근 Toast 작업으로 `EditorPage.handleSubmit`, `useLike`, `DraftsPage` 등 여러 지점이 수정된 직후라, 회귀 방어용 behavior lock 테스트를 도입합니다.

**Non-goals:**
- 스냅샷 테스트
- 드래그드롭/키보드 리사이즈 같은 마우스 이벤트 시뮬레이션
- E2E 브라우저 테스트
- 코드 커버리지 지표 목표치
- 리팩토링 (테스트 때문에 소스 건드리지 않음. 꼭 필요하면 pure function 추출 1건만 허용)

## 2. Decisions Summary

| Topic | Decision |
|---|---|
| 스코프 | "Balanced" — ~30 테스트, 6개 파일, ~300 LOC |
| API 모킹 | `vi.mock('../utils/api')` 파일 단위 |
| Router | `vi.mock('react-router-dom', ...)` 필요한 파일만 |
| Wrapper | `renderWithProviders` 헬퍼 (MemoryRouter + AuthContext + ToastProvider) |
| 픽스처 | `test-utils/fixtures.ts` — `makePost()`, `makeComment()`, `makeAuthValue()` |
| 테스트 스타일 | 회귀잠금 (behavior lock). 현재 동작을 기준으로 작성 |
| 리팩토링 정책 | 원칙: 소스 변경 없음. 테스트 가능성 문제 시 질의 후 최소 변경 |
| Spec 위치 | `tolelog/docs/superpowers/specs/` |

## 3. Architecture

```
src/
├── test-utils/
│   ├── renderWithProviders.tsx   # MemoryRouter + AuthContext + ToastProvider wrapper
│   └── fixtures.ts               # Post/Comment/Auth 픽스처 빌더
├── components/__tests__/
│   ├── CommentSection.test.tsx   # ~6 tests
│   ├── BlockEditor.test.tsx      # ~5 tests
│   ├── EditorToolbar.test.tsx    # ~3 tests
│   └── ImageUploadButton.test.tsx # ~2 tests
└── pages/__tests__/
    ├── EditorPage.test.tsx       # ~9 tests
    └── PostDetailPage.test.tsx   # ~6 tests
```

## 4. Test Infrastructure

### 4.1 `renderWithProviders` 헬퍼

```tsx
// src/test-utils/renderWithProviders.tsx
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { ReactElement } from 'react';
import { AuthContext, type AuthContextType } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastProvider';
import { makeAuthValue } from './fixtures';

export interface RenderOptionsEx extends Omit<RenderOptions, 'wrapper'> {
    authValue?: Partial<AuthContextType>;
    route?: string;       // 초기 경로, 기본 '/'
    path?: string;        // 라우트 매칭 패턴. 지정 시 <Routes>로 감쌈
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

### 4.2 `fixtures.ts`

```ts
// src/test-utils/fixtures.ts
import type { Post, Comment } from '../types';
import type { AuthContextType } from '../context/AuthContext';

export function makePost(overrides: Partial<Post> = {}): Post {
    return {
        id: 1,
        user_id: 1,
        author: 'testuser',
        title: 'Hello',
        content: '# Hi',
        is_public: true,
        like_count: 0,
        comment_count: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

export function makeComment(overrides: Partial<Comment> = {}): Comment {
    return {
        id: 1,
        user_id: 1,
        post_id: 1,
        author: 'testuser',
        content: 'nice',
        avatar_url: null,
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

`Post`/`Comment` 필드명은 `src/types/index.ts`에서 확인. 현재 가정과 다를 경우 구현 단계에서 맞춤.

## 5. Test Specifications

각 파일별로 잠그려는 behavior를 나열합니다. 모든 테스트는 `describe` 블록으로 파일명 그룹.

### 5.1 `CommentSection.test.tsx` (~6 tests)

**API mocks:** `COMMENT_API.getComments`, `COMMENT_API.createComment`, `COMMENT_API.deleteComment`

1. **로드 후 댓글 리스트 렌더** — `getComments` 성공 시 각 댓글의 `author`/`content`가 보임, 총 개수가 `.comment-count`에 표시됨.
2. **비로그인 시 로그인 링크 표시, 폼 없음** — `authValue = { token: null }`이면 `/login` 링크가 보이고 `<textarea>` 렌더 안 됨.
3. **작성 성공** — 로그인 상태에서 textarea에 타이핑 → submit 클릭 → `createComment`가 올바른 인자로 호출됨 → `getComments`가 다시 호출되어 리스트 업데이트됨.
4. **작성 실패 시 에러 인라인 표시 (toast 아님)** — `createComment`가 reject하면 `.comment-error`에 메시지가 표시됨. `CommentSection`은 toast를 쓰지 않고 자체 state에 error를 유지함 — 이 점을 잠근다.
5. **본인 댓글에만 삭제 버튼** — `userId` 일치하는 댓글만 `삭제` 버튼이 렌더됨. 다른 유저 댓글엔 없음.
6. **삭제 성공** — 삭제 버튼 클릭 → `deleteComment` 호출 → `getComments` 재호출.

### 5.2 `EditorPage.test.tsx` (~9 tests)

**API mocks:** `POST_API.getPost`, `POST_API.createPost`, `POST_API.updatePost`, `SERIES_API.getUserSeries`
**Router mocks:** `useNavigate` (spy), `useParams` (postId 지정), `useLocation` (pathname 제어)

1. **edit 모드에서 기존 글 prefill** — `useParams({ postId: '5' })` + `getPost` mock → title/content textarea에 해당 값이 초기 렌더됨.
2. **new 모드에서 prefill 없음** — `useParams({})` → title/content 비어 있음.
3. **저장 성공 → 토스트 + 네비게이션** — submit 클릭 → `createPost` 호출, `toast.success` 표시(예: `screen.findByText('글이 저장되었습니다!')`), `navigate` 호출됨.
4. **저장 실패 (non-401) → 토스트 + 인라인 error** — `createPost` rejects with `{status: 500}` → inline `setError` 메시지 표시 + toast.error 보임.
5. **401 → /login으로 navigate, 토스트는 없음** — `createPost` rejects `{status: 401}` → `mockNavigate('/login')` 호출됨. (EditorPage는 자체 toast를 안 띄움; `authenticatedFetch`가 이미 토스트함)
6. **비공개 글 저장 시 is_public=false 전송** — "비공개" 체크박스 토글 후 저장 → `createPost` 호출 인자 `is_public === false`.
7. **시리즈 셀렉터가 getUserSeries 결과 렌더** — `SERIES_API.getUserSeries` 성공 → `<select>` options에 시리즈 이름들 렌더됨.
8. **자동저장 localStorage 트리거** — 타이핑 후 `AUTO_SAVE_DELAY_MS`+α 시간 경과 → `localStorage.getItem(STORAGE_KEYS.DRAFT)`에 내용 저장됨. (`vi.useFakeTimers()` 필요)
9. **draft 초기화 (clearDraft) 동작** — 저장 성공 후 localStorage draft가 삭제됨.

### 5.3 `PostDetailPage.test.tsx` (~6 tests)

**API mocks:** `POST_API.getPost`, `LIKE_API.getStatus`, `LIKE_API.toggle`, `COMMENT_API.getComments`
**Router mocks:** `useParams({ postId: '1' })`, `useNavigate`

1. **글 렌더** — title/author/content가 화면에 보임.
2. **404 분기** — `getPost`가 `{status: 404}` reject → "글을 찾을 수 없습니다" 메시지.
3. **비로그인 시 좋아요 버튼 disabled** — `authValue.token === null` → `<button disabled>`.
4. **좋아요 클릭** — 로그인 상태에서 버튼 클릭 → `LIKE_API.toggle` 호출, 반환값대로 count/liked 업데이트. (optimistic 아닌 서버 응답 기반)
5. **댓글 섹션 렌더** — `COMMENT_API.getComments`가 빈 배열 반환해도 CommentSection 자체는 렌더됨.
6. **본인 글에만 삭제 버튼** — `userId` === `post.user_id`일 때만 삭제 버튼이 보임.

### 5.4 `BlockEditor.test.tsx` (~5 tests)

**No API mocks needed** — 순수 컴포넌트

1. **초기 content → blocks 분할 렌더** — `content="# A\n\n# B"` → 여러 textarea 블록으로 렌더. 각 블록 textarea value가 올바른 행을 담음.
2. **ref.wrapSelection은 onChange를 호출** — parent에서 ref 잡고 `ref.current?.wrapSelection('**','**')` 호출 → `onChange` 콜백이 수정된 content로 호출됨. (selection 범위 0-0인 케이스: 커서 위치에 prefix+suffix 삽입 동작 잠금)
3. **Enter 키 → 블록 분할** — textarea에 fireEvent.keyDown(..., { key: 'Enter' }) → 블록이 두 개로 쪼개지고 `onChange` 호출.
4. **블록 텍스트 변경 → onChange** — textarea에 `change` 이벤트 → `onChange`가 새 content로 호출됨.
5. **`insertImage` 호출 시 이미지 블록 추가** — ref.insertImage(base64, filename) → onChange가 `![filename](base64)` 포함한 content로 호출됨.

**주의:** `BlockEditor`의 내부 DOM 구조 / 리사이즈 / 드래그드롭은 테스트하지 않음. 오직 외부 계약(public API + onChange)만.

### 5.5 `EditorToolbar.test.tsx` (~3 tests)

**No API mocks needed** — 순수 컴포넌트

1. **모든 버튼 렌더** — heading, bold, italic, strike, code, link, image, preview 버튼이 모두 보임.
2. **각 버튼 클릭 → onFormat이 올바른 type으로 호출** — "B" 클릭 → `onFormat('bold')`, "I" 클릭 → `onFormat('italic')` 등. `onFormat`은 `vi.fn()`.
3. **previewDisabled=true일 때 preview 버튼 disabled** — `<button disabled>`.

### 5.6 `ImageUploadButton.test.tsx` (~2 tests)

**Mocks:** `vi.mock('../utils/imageUpload')` — `validateImageFile`, `compressImage`, `uploadImageToServer` 각각 mock

1. **업로드 실패 시 인라인 에러** — `uploadImageToServer`가 throw → `.image-error`에 메시지 표시. `onImageInsert`는 호출 안 됨.
2. **업로드 성공 시 onImageInsert 호출** — 성공 → `onImageInsert(`${serverOrigin}${imageUrl}`, file.name)` 호출됨. fullUrl 계산 로직도 함께 잠금.

**Note:** 압축 자체의 픽셀 로직은 테스트하지 않음 (canvas API는 jsdom에서 동작 이상함). `compressImage`를 mock으로 대체해 compressed File을 그대로 반환하게 함.

## 6. Conventions

- **테스트 이름 (it 블록)**: 한국어 + 현재형. 예: `it('본인 댓글에만 삭제 버튼이 보인다')`
- **mock 리셋**: `beforeEach(() => { vi.clearAllMocks(); })` 파일 최상단
- **fake timers**: 필요한 테스트에서만 (`EditorPage.autoSave`) `vi.useFakeTimers()` 사용, `afterEach`에서 `useRealTimers`
- **비동기 대기**: `await screen.findByText(...)` 우선, 타임아웃은 기본값

## 7. Rollout Plan (implementation phases)

1. **Phase A — 테스트 인프라**: `test-utils/renderWithProviders.tsx` + `test-utils/fixtures.ts`
2. **Phase B — 순수 컴포넌트부터**: `EditorToolbar.test.tsx`, `ImageUploadButton.test.tsx`, `BlockEditor.test.tsx`
3. **Phase C — 통합 컴포넌트**: `CommentSection.test.tsx`
4. **Phase D — 페이지 통합**: `PostDetailPage.test.tsx`, `EditorPage.test.tsx`
5. **Phase E — 최종 검증**: `npm run lint && npm run type-check && npm run build && npm run test`

## 8. Open Risks / Follow-ups (not in scope)

- BlockEditor 드래그드롭 회귀 → E2E 또는 별도 task
- Editor 이미지 리사이즈 마우스 이벤트 → 별도 task
- 커버리지 지표 자동화 → 별도 task (vitest `--coverage` 옵션)
- MSW 도입 → 다른 시점에 검토
