# Skeleton Gap-Fill — Design Spec

**Date**: 2026-04-25
**Status**: Approved, ready for implementation planning
**Scope**: `tolelog/` React frontend, 2 pages

## 1. Goal & Context

HomePage, UserProfilePage, SeriesDetailPage는 이미 shimmer skeleton을 쓰고 `src/index.css`에 `.skeleton-*` 유틸리티 세트가 완성되어 있다. 하지만 **PostDetailPage와 DraftsPage는 아직 단순 스피너만** 사용 중이라 일관성 부재. 이 두 곳에 기존 유틸리티를 재사용하는 article/list skeleton을 추가해 로딩 UX를 통일한다.

**Non-goals:**
- 새 skeleton 유틸리티 클래스 (기존 것으로 충분)
- 다른 페이지 (이미 skeleton 있음)
- `prefers-reduced-motion` 대응 (별도 a11y 작업)
- 자동 테스트 (UI 세부 변경이라 회귀잠금 가치 낮음; 수동 브라우저 확인)
- Empty state CTA 보강 (scope creep)

## 2. Decisions Summary

| Topic | Decision |
|---|---|
| 대상 | PostDetailPage + DraftsPage |
| CSS 재사용 | 기존 `.skeleton`, `.skeleton-text(-sm/-lg)`, `.skeleton-w-*`, `.skeleton-h-28`, `.skeleton-mb-16` |
| 새 CSS 클래스 | PostDetailPage에 2개 (`.post-meta-skeleton`, `.post-content-skeleton`), DraftsPage에 1개 (`.drafts-item-skeleton`) |
| 제거 CSS | 기존 `.drafts-loading` (스피너 스타일, 더 이상 사용 안 함) |
| A11y | 두 skeleton 컨테이너에 `aria-busy="true"` |
| 테스트 | 자동 테스트 없음. 수동 브라우저 확인 (새로고침 + 네트워크 throttle) |

## 3. PostDetailPage Skeleton

### 3.1 TSX 변경

현재 (lines 155-160 근처):
```tsx
if (isLoading) {
    return (
        <div className="post-detail-page">
            <div className="loading-container"><div className="spinner"></div><p>글을 불러오는 중...</p></div>
        </div>
    );
}
```

교체:
```tsx
if (isLoading) {
    return (
        <div className="post-detail-page">
            <article className="post-detail" aria-busy="true">
                <div className="skeleton skeleton-text-lg skeleton-w-70p skeleton-mb-16" />
                <div className="post-meta-skeleton">
                    <div className="skeleton skeleton-text-sm skeleton-w-80" />
                    <div className="skeleton skeleton-text-sm skeleton-w-60" />
                    <div className="skeleton skeleton-text-sm skeleton-w-50" />
                </div>
                <div className="post-content-skeleton">
                    <div className="skeleton skeleton-text skeleton-w-full" />
                    <div className="skeleton skeleton-text skeleton-w-90p" />
                    <div className="skeleton skeleton-text skeleton-w-full" />
                    <div className="skeleton skeleton-text skeleton-w-80p" />
                    <div className="skeleton skeleton-text skeleton-w-65p" />
                </div>
            </article>
        </div>
    );
}
```

### 3.2 CSS 추가 (`src/pages/PostDetailPage.css`)

```css
.post-meta-skeleton {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
}
.post-content-skeleton {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
```

## 4. DraftsPage Skeleton

### 4.1 TSX 변경

현재 (line 53):
```tsx
{isLoading && <div className="drafts-loading" aria-label="불러오는 중" />}
```

교체:
```tsx
{isLoading && (
    <ul className="drafts-list" aria-busy="true" aria-label="불러오는 중">
        {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="drafts-item drafts-item-skeleton">
                <div className="drafts-item-link">
                    <span className="skeleton skeleton-text skeleton-w-60p" />
                    <span className="skeleton skeleton-text-sm skeleton-w-80" />
                </div>
                <div className="skeleton skeleton-h-28 skeleton-w-60" />
            </li>
        ))}
    </ul>
)}
```

### 4.2 CSS 변경 (`src/pages/DraftsPage.css`)

**삭제:** 기존 `.drafts-loading` 블록 전체 (`::before` 포함, 약 15줄).

**추가:**
```css
.drafts-item-skeleton {
    pointer-events: none;
}
.drafts-item-skeleton .drafts-item-link {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
}
```

`.drafts-item-link`는 이미 `.drafts-item` 내부에 있는 클래스라 `.drafts-item-skeleton .drafts-item-link`로 스코프 한정.

## 5. Acceptance Criteria

수동 브라우저 확인 (`npm run dev` + DevTools Network = Slow 3G):

1. **PostDetailPage**: `/post/1` 접속 시 기존 스피너가 아닌 article shape skeleton(제목 라인 + meta 3개 + 본문 5줄)이 shimmer 애니메이션과 함께 보여야 함. 로드 완료 시 실제 글로 교체.
2. **DraftsPage**: `/drafts` 접속 시 drafts-item 모양 skeleton 3개가 shimmer 애니메이션과 함께 보여야 함. 로드 완료 시 실제 초안 목록으로 교체.
3. **다크모드**: 두 skeleton 모두 `[data-theme="dark"]`에서 대비 정상.
4. **모바일 (≤768px)**: 레이아웃 깨지지 않음.
5. **CI**: `npm run lint && npm run type-check && npm run build && npm run test` 전부 green (143 테스트 유지).

## 6. Files Touched

**Modified (4):**
- `src/pages/PostDetailPage.tsx` — `isLoading` 분기 교체
- `src/pages/PostDetailPage.css` — 2개 클래스 추가
- `src/pages/DraftsPage.tsx` — `isLoading` 분기 교체
- `src/pages/DraftsPage.css` — `.drafts-loading` 삭제, `.drafts-item-skeleton` 추가

**Created:** 없음.

예상 총 변경량: ~40-60줄.

## 7. Open Risks / Follow-ups (not in scope)

- `prefers-reduced-motion`에서 shimmer 끄기 — 별도 a11y 패스
- Skeleton이 실제 content와 layout shift를 일으키면 (heights/margins가 미묘하게 다름) → 원래 요소의 정확한 heights를 매칭하도록 튜닝 필요할 수 있음. 수동 확인 시 발견되면 별도 후속.
- HomePage/UserProfilePage/SeriesDetailPage의 skeleton을 audit해서 실제 content와 일치하는지 점검 — 별도 작업.
