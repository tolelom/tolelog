# M6 큰 파일 리팩토링 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 400~525줄 파일 4개(api.ts, markdownParser.ts, post/service.go, UserProfilePage.tsx)를 책임 단위로 분리한다. **동작 변경 0.**

**Architecture:** 프론트는 배럴 re-export로 기존 import 30여 곳 무변경 유지. 백엔드는 동일 패키지 내 파일 분리(호출부 영향 0). 유닛당 1커밋, 매 유닛 후 전체 검증.

**Tech Stack:** TypeScript/React 19/Vite/Vitest (tolelog), Go/GORM (fiber_api_server)

**스펙:** `docs/superpowers/specs/2026-06-04-m6-large-file-refactoring-design.md`

**절대 규칙:**
- 이동하는 코드는 **한 글자도 수정 금지** (import 경로 조정만 허용)
- 로직 개선·버그 수정 발견 시 → 수정하지 말고 DONE_WITH_CONCERNS로 보고
- 각 Task 종료 시 전체 테스트 + type-check (백엔드는 go test ./... + vet)

---

### Task 1: `utils/api.ts` → `utils/api/` 디렉터리 + 배럴

**작업 디렉터리:** `C:\Users\SSAFY\Desktop\projects\tolelom\tolelog`

**Files:**
- Create: `src/utils/api/client.ts`, `src/utils/api/posts.ts`, `src/utils/api/auth.ts`, `src/utils/api/comments.ts`, `src/utils/api/series.ts`, `src/utils/api/misc.ts`
- Modify: `src/utils/api.ts` (배럴로 교체)

**현재 `src/utils/api.ts` 구조 (400줄, 이 줄 번호 기준으로 이동):**

| 줄 범위 | 내용 | 이동 대상 |
|---------|------|----------|
| 1-3 | imports (constants, notify, types) | 각 파일에 필요한 것만 복사 |
| 5-10 | `interface ApiError` | client.ts |
| 12 | `let refreshInFlight` | client.ts |
| 14-43 | `async function doRefresh` | client.ts |
| 44-50 | `async function tryRefreshToken` | client.ts |
| 52-108 | `async function authenticatedFetch<T>` | client.ts |
| 110-135 | `export const IMAGE_API` | misc.ts |
| 136-202 | `export const AUTH_API` | auth.ts |
| 203-236 | `export const USER_API` | auth.ts |
| 237-268 | `export const COMMENT_API` | comments.ts |
| 269-304 | `export const SERIES_API` | series.ts |
| 305-317 | `export const LIKE_API` | misc.ts |
| 318-325 | `export const TAG_API` | misc.ts |
| 326-400 | `export const POST_API` | posts.ts |

- [ ] **Step 1: `src/utils/api/client.ts` 생성**

api.ts의 5-108줄(ApiError, refreshInFlight, doRefresh, tryRefreshToken, authenticatedFetch)을 **그대로** 이동. 상단 import는 원본 1-3줄에서 이 코드들이 실제 사용하는 것만 (경로가 한 단계 깊어지므로 `../constants`, `../notify`, `../../types` 식으로 조정):

```typescript
import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { notify } from '../notify';
// (원본 3줄의 type import 중 client 코드가 쓰는 타입만 — 코드 이동 후 type-check가 알려줌)
```

`authenticatedFetch`와 `ApiError`는 형제 모듈이 쓰도록 **export 추가** (원본은 비공개였음 — 배럴이 재노출하지 않으므로 공개 표면 불변):

```typescript
export interface ApiError extends Error { /* 원본 5-10줄 본문 그대로 */ }
export async function authenticatedFetch<T = unknown>(/* 원본 시그니처 그대로 */) { /* 본문 그대로 */ }
```

doRefresh/tryRefreshToken/refreshInFlight는 export하지 않음 (client.ts 내부 전용 — authenticatedFetch만 이들을 사용).

- [ ] **Step 2: 도메인 파일 5개 생성**

각 파일: 해당 API 객체를 원본에서 **그대로** 이동 + 필요한 import만 상단에 추가.

`src/utils/api/posts.ts` — POST_API (원본 326-400줄):
```typescript
import { API_BASE_URL } from '../constants';
import { authenticatedFetch } from './client';
// + POST_API가 쓰는 type import (../../types)

export const POST_API = { /* 원본 그대로 */ };
```

`src/utils/api/auth.ts` — AUTH_API(136-202) + USER_API(203-236), 동일 패턴.
`src/utils/api/comments.ts` — COMMENT_API(237-268).
`src/utils/api/series.ts` — SERIES_API(269-304).
`src/utils/api/misc.ts` — IMAGE_API(110-135) + LIKE_API(305-317) + TAG_API(318-325).

각 파일에서 실제 필요한 import만 추가 (안 쓰는 import는 lint가 잡음). AUTH_API가 doRefresh 같은 client 내부 함수를 직접 쓰면 client.ts에서 해당 함수도 export (최소한으로).

- [ ] **Step 3: `src/utils/api.ts`를 배럴로 교체**

기존 400줄 전체를 다음으로 교체 (공개 표면 = 기존 export 8개와 정확히 동일, authenticatedFetch는 재노출 금지):

```typescript
// 도메인별 API 모듈의 배럴 re-export.
// 기존 import 경로('utils/api') 호환을 위해 유지한다. 구현은 ./api/ 하위 참조.
export { POST_API } from './api/posts';
export { AUTH_API, USER_API } from './api/auth';
export { COMMENT_API } from './api/comments';
export { SERIES_API } from './api/series';
export { IMAGE_API, LIKE_API, TAG_API } from './api/misc';
```

- [ ] **Step 4: 검증**

Run: `npm run type-check` → 에러 0
Run: `npx vitest run src/utils/__tests__/api.test.ts` → 기존 테스트 전부 PASS (배럴 경유 동작 확인)
Run: `npm run test` → 전체 PASS (206개 기준)
Run: `npm run lint` → 새 에러 0 (기존 워닝 9개는 무관)

- [ ] **Step 5: 줄수 확인 + 커밋**

각 새 파일이 200줄 이하인지 확인 (`(Get-Content <file> | Measure-Object -Line).Lines`).

```bash
git add src/utils/api.ts src/utils/api/
git commit -m "refactor: api.ts를 도메인별 모듈로 분리 (배럴 호환 유지)"
```

---

### Task 2: `utils/markdownParser.ts` → `utils/markdown/` 디렉터리 + 배럴

**작업 디렉터리:** `C:\Users\SSAFY\Desktop\projects\tolelom\tolelog`

**Files:**
- Create: `src/utils/markdown/katex.ts`, `src/utils/markdown/text.ts`, `src/utils/markdown/inline.ts`, `src/utils/markdown/blocks.ts`, `src/utils/markdown/render.ts`
- Modify: `src/utils/markdownParser.ts` (배럴로 교체)

**현재 구조 (525줄 기준) 및 이동 매핑:**

| 줄 범위 | 내용 | 이동 대상 | export 여부 |
|---------|------|----------|------------|
| 9-68 | KatexModule, katexModule/katexLoading/katexReadyCallbacks, notifyKatexReady, subscribeKatexReady, isKatexReady, hasMath, loadKatex, renderKatex | katex.ts | subscribeKatexReady/isKatexReady/hasMath는 공개, renderKatex는 inline.ts용 export 추가, 나머지 내부 |
| 70-84 | escapeHtml, slugifyHeading | text.ts | slugifyHeading 공개, escapeHtml은 형제용 export |
| 86-217 | parseInlineWithRefs, parseInline | inline.ts | parseInline 공개, parseInlineWithRefs는 render.ts용 export |
| 219-487 | parseBlocks, parseTableRow, parseTableAlignments, ListParseResult, parseList | blocks.ts | parseBlocks 공개, 나머지 내부 |
| 488-525 | renderBlockWithRefs, renderBlock, renderMarkdownWithRefs, renderMarkdown | render.ts | renderBlock/renderMarkdown 공개 |

- [ ] **Step 1: 5개 파일 생성 (코드 그대로 이동, import만 조정)**

의존 방향 (순환 금지): render → inline·blocks·text / inline → katex·text / blocks → (text 필요 시) / katex·text → 없음.

각 파일 상단 import 예시:
```typescript
// inline.ts
import { renderKatex, isKatexReady, hasMath, loadKatex } from './katex'; // 실제 사용하는 것만
import { escapeHtml } from './text';
// render.ts
import { parseInlineWithRefs } from './inline';
import { escapeHtml } from './text';
import type { Block } from '../../types'; // Block 타입 위치는 원본 import 따름
```
원본 markdownParser.ts 상단 import(1-7줄)에서 각 코드가 쓰는 것만 분배. DOMPurify를 쓰는 코드는 그 파일로 함께 이동.

- [ ] **Step 2: `src/utils/markdownParser.ts`를 배럴로 교체**

기존 공개 export 8개를 정확히 유지:

```typescript
// 마크다운 파서 모듈의 배럴 re-export. 기존 import 경로 호환 유지. 구현은 ./markdown/ 하위.
export { subscribeKatexReady, isKatexReady, hasMath } from './markdown/katex';
export { slugifyHeading } from './markdown/text';
export { parseInline } from './markdown/inline';
export { parseBlocks } from './markdown/blocks';
export { renderBlock, renderMarkdown } from './markdown/render';
```

(원본에 위 8개 외 export가 더 있으면 — type export 등 — 같이 배럴에 추가. 빠뜨리면 type-check가 잡음.)

- [ ] **Step 3: 검증**

Run: `npm run type-check` → 에러 0
Run: `npx vitest run src/utils/__tests__/markdownParser.test.ts` → 전부 PASS
Run: `npm run test` → 전체 PASS
Run: `npm run build` → SSG 빌드 성공 (markdown은 prerender 경로에서 실행되므로 필수)

- [ ] **Step 4: 커밋**

```bash
git add src/utils/markdownParser.ts src/utils/markdown/
git commit -m "refactor: markdownParser를 katex/text/inline/blocks/render 모듈로 분리"
```

---

### Task 3: `internal/post/service.go` 분리 — **백엔드 레포**

**작업 디렉터리:** `C:\Users\SSAFY\Desktop\projects\tolelom\fiber_api_server`

**Files:**
- Create: `internal/post/service_query.go`, `internal/post/service_like.go`, `internal/post/service_cache.go`
- Modify: `internal/post/service.go`

**현재 service.go (497줄) 이동 매핑 (전부 `package post` 유지, 메서드 시그니처 무변경):**

| 현재 위치 | 내용 | 이동 대상 |
|----------|------|----------|
| 17-25 | validTagPattern, sentinel 에러들 | service.go 잔류 (에러는 패키지 공유) |
| 27-37 | 캐시 키 상수/TTL, validSearchPattern | 캐시 상수 → service_cache.go, validSearchPattern → service_query.go |
| 39-64 | SanitizeSearchQuery, SanitizeTag | service_query.go (validTagPattern도 함께) |
| 66-98 | Service 인터페이스, service 구조체, NewService, splitTags | service.go 잔류 |
| 100-114 | syncTags | service.go 잔류 (CreatePost/UpdatePost가 사용) |
| 116-135 | invalidatePostCaches, cachedPublicPostList | service_cache.go |
| 137-215 | CreatePost, GetPostByID | service.go 잔류 |
| 217-268 | GetPublicPosts | service_query.go |
| 270-308 | GetUserPosts | service_query.go |
| 310-372 | UpdatePost | service.go 잔류 |
| 374-404 | escapeLike, SearchPosts | service_query.go |
| 406-427 | DeletePost | service.go 잔류 |
| 429-478 | ToggleLike | service_like.go |
| 480-490 | GetDrafts | service_query.go |
| 492-497 | IsLiked | service_like.go |

- [ ] **Step 1: 3개 파일 생성, 코드 그대로 이동**

각 새 파일 상단:
```go
package post

import (
	// 이동한 코드가 실제 쓰는 것만 — goimports/컴파일러가 검증
)
```
주의: validTagPattern을 service_query.go로 옮기면 GetPublicPosts/GetUserPosts의 SanitizeTag 호출과 같은 파일이 됨 (정합). sentinel 에러(ErrPostNotFound 등)는 service.go에 남아도 동일 패키지라 전 파일에서 접근 가능.

- [ ] **Step 2: 검증**

Run: `go build ./...` → 성공
Run: `go test ./internal/post/ -v -count=1` → 전부 PASS (service_db_test.go 24개 포함)
Run: `go test ./...` → 전 패키지 ok
Run: `go vet ./...` → 클린

- [ ] **Step 3: 줄수 확인 + 커밋**

service.go가 ~300줄 이하로 줄었는지 확인.

```bash
git add internal/post/
git commit -m "refactor: post service를 query/like/cache 파일로 분리"
```

---

### Task 4: `UserProfilePage.tsx` 섹션 컴포넌트 추출

**작업 디렉터리:** `C:\Users\SSAFY\Desktop\projects\tolelom\tolelog`

**Files:**
- Create: `src/components/profile/ProfileSeriesSection.tsx`, `src/components/profile/ProfilePostList.tsx`
- Modify: `src/pages/UserProfilePage.tsx` (470줄 → 목표 ~250줄)

**현재 구조 (이동 대상):**
- 시리즈 관련 상태 4개(41-44줄: seriesModalOpen, editingSeries, deletingSeriesId, seriesError) + 핸들러 3개(108-140줄: handleCreateSeries/handleUpdateSeries/handleDeleteSeries) + 시리즈 탭 JSX(331-407줄 부근) → ProfileSeriesSection
- 글 탭 JSX(409-470줄 부근: 제목/태그필터/포스트 카드 목록) → ProfilePostList
- 잔류: profile/posts/페이지네이션/avatar 상태, 데이터 페칭 useEffect, 프로필 헤더 JSX, 탭 버튼

- [ ] **Step 1: `ProfileSeriesSection.tsx` 생성**

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SERIES_API } from '../../utils/api';
import SeriesFormModal from '../SeriesFormModal';
import type { Series } from '../../types';

interface ProfileSeriesSectionProps {
    /** 표시할 시리즈 목록 (소유는 부모 — 통계 표시에 공유됨) */
    seriesList: Series[];
    /** 본인 프로필 여부 — true일 때만 생성/수정/삭제 UI 노출 */
    isOwner: boolean;
    token: string | null;
    /** CRUD 성공 후 부모가 목록을 다시 동기화하도록 알림 */
    onSeriesChange: (next: Series[]) => void;
}

export default function ProfileSeriesSection({ seriesList, isOwner, token, onSeriesChange }: ProfileSeriesSectionProps) {
    const [seriesModalOpen, setSeriesModalOpen] = useState(false);
    const [editingSeries, setEditingSeries] = useState<Series | null>(null);
    const [deletingSeriesId, setDeletingSeriesId] = useState<number | null>(null);
    const [seriesError, setSeriesError] = useState('');

    // handleCreateSeries / handleUpdateSeries / handleDeleteSeries:
    // UserProfilePage 108-140줄 본문을 그대로 이동하되,
    // setSeriesList(...) 호출만 onSeriesChange(...)로 치환.
    // toast 사용부는 원본 그대로 (notify as toast import 포함해 이동).

    return (
        <div className="profile-series-section">
            {/* UserProfilePage의 시리즈 탭 JSX(331-407 부근)를 클래스명 무변경으로 그대로 이동 */}
        </div>
    );
}
```

원본 핸들러가 참조하던 부모 상태(seriesList 갱신)는 props 콜백으로 치환. 그 외 로직·문구·클래스명 무변경.

- [ ] **Step 2: `ProfilePostList.tsx` 생성 (표시 전용)**

```typescript
import { Link, SetURLSearchParams } from 'react-router-dom';
import { stripMarkdown, formatDate } from '../../utils/format';
import { postPath } from '../../utils/slug';
import type { PostListItem } from '../../types';

interface ProfilePostListProps {
    posts: PostListItem[];
    totalPosts: number;
    /** 본인 프로필이면 비공개 글 뱃지 표시 등 */
    isOwner: boolean;
    loading: boolean;
    tagFilter: string | null;
    onClearTagFilter: () => void;
}

export default function ProfilePostList({ posts, totalPosts, isOwner, loading, tagFilter, onClearTagFilter }: ProfilePostListProps) {
    return (
        <div className="profile-posts-section">
            {/* UserProfilePage의 글 탭 JSX(409-470 부근)를 클래스명 무변경으로 그대로 이동.
                searchParams 직접 접근은 tagFilter/onClearTagFilter props로 치환. */}
        </div>
    );
}
```

실제 props는 이동하는 JSX가 참조하는 변수 목록에 맞춰 조정 (위는 출발점 — 원본 JSX가 쓰는 모든 식별자를 props로 받을 것. 페이지네이션 UI가 JSX 안에 있으면 onPageChange 류 콜백 추가).

- [ ] **Step 3: `UserProfilePage.tsx`에서 해당 코드 제거 + 새 컴포넌트 사용**

```tsx
{activeTab === 'series' && (
    <ProfileSeriesSection
        seriesList={seriesList}
        isOwner={isOwner}
        token={token}
        onSeriesChange={setSeriesList}
    />
)}
{activeTab === 'posts' && (
    <ProfilePostList ... />
)}
```

이동으로 안 쓰게 된 import/상태 제거 (lint가 잡음). `isOwner`가 기존에 인라인 비교(`currentUserId === profile.id` 류)면 변수로 추출해 props에 전달.

- [ ] **Step 4: 검증**

Run: `npm run type-check` → 에러 0
Run: `npm run lint` → 새 에러/워닝 0
Run: `npm run test` → 전체 PASS
Run: `npm run build` → SSG 빌드 성공 (UserProfilePage는 sitemap 경유 prerender 대상)
Run: `(Get-Content src/pages/UserProfilePage.tsx | Measure-Object -Line).Lines` → ~250줄 내외 확인

- [ ] **Step 5: 커밋**

```bash
git add src/pages/UserProfilePage.tsx src/components/profile/
git commit -m "refactor: UserProfilePage에서 시리즈/글 섹션 컴포넌트 추출"
```

---

### Task 5: 최종 검증

- [ ] **Step 1: 프론트 전체** — `npm run type-check && npm run lint && npm run test && npm run build` 모두 성공
- [ ] **Step 2: 백엔드 전체** — `go test ./... && go vet ./...` 모두 성공
- [ ] **Step 3: 줄수 리포트** — 4개 대상 파일의 before→after 줄수를 보고에 포함
- [ ] **Step 4: 동작 변경 0 확인** — `git diff <base>..HEAD --stat`으로 변경 파일이 계획된 파일들뿐인지 확인
