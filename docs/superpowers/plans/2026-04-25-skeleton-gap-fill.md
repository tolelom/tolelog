# Skeleton Gap-Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the spinner-only loading states on PostDetailPage and DraftsPage with shimmer skeleton UIs that match the rest of the app.

**Architecture:** Reuse existing `.skeleton-*` utility classes from `src/index.css`. Two new layout-only CSS classes added to PostDetailPage.css; one to DraftsPage.css. Old `.drafts-loading` spinner CSS block deleted. No new files, no new dependencies.

**Tech Stack:** React 19, TypeScript, CSS custom properties. Test runner: Vitest 4.1 + @testing-library/react (143 existing tests must stay green).

---

## Files Touched

| File | Change |
|---|---|
| `src/pages/PostDetailPage.tsx` | Replace `isLoading` spinner branch with article skeleton |
| `src/pages/PostDetailPage.css` | Add `.post-meta-skeleton` and `.post-content-skeleton` |
| `src/pages/DraftsPage.tsx` | Replace `drafts-loading` div with 3-item skeleton list |
| `src/pages/DraftsPage.css` | Delete `.drafts-loading` block; add `.drafts-item-skeleton` rules |

---

### Task 1: PostDetailPage skeleton

**Files:**
- Modify: `src/pages/PostDetailPage.tsx` (lines 155-161)
- Modify: `src/pages/PostDetailPage.css` (append)

No automated tests for this task — per spec, verification is manual browser check. The existing 6 PostDetailPage tests (which test the loaded state) must still pass.

- [ ] **Step 1: Replace the `isLoading` branch in PostDetailPage.tsx**

Open `src/pages/PostDetailPage.tsx`. The current block at lines 155-161 is:

```tsx
if (isLoading) {
    return (
        <div className="post-detail-page">
            <div className="loading-container"><div className="spinner"></div><p>글을 불러오는 중...</p></div>
        </div>
    );
}
```

Replace it with:

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

- [ ] **Step 2: Add layout CSS to PostDetailPage.css**

Append to `src/pages/PostDetailPage.css`:

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

- [ ] **Step 3: Run the existing test suite to confirm no regressions**

```bash
npm run lint && npm run type-check && npm run test -- --reporter=verbose 2>&1 | tail -20
```

Expected: All 143 tests pass, no lint/type errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PostDetailPage.tsx src/pages/PostDetailPage.css
git commit -m "feat: replace PostDetailPage spinner with shimmer skeleton"
```

---

### Task 2: DraftsPage skeleton

**Files:**
- Modify: `src/pages/DraftsPage.tsx` (line 53)
- Modify: `src/pages/DraftsPage.css` (delete `.drafts-loading` block, add `.drafts-item-skeleton` rules)

No automated tests — manual browser verification per spec. Existing tests must pass.

- [ ] **Step 1: Replace the `isLoading` div in DraftsPage.tsx**

Open `src/pages/DraftsPage.tsx`. The current line 53 is:

```tsx
{isLoading && <div className="drafts-loading" aria-label="불러오는 중" />}
```

Replace it with:

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

- [ ] **Step 2: Update DraftsPage.css — delete old spinner, add skeleton rules**

Open `src/pages/DraftsPage.css`. Delete the entire `.drafts-loading` block (lines 14-30):

```css
.drafts-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 3rem 0;
    color: var(--text-secondary);
}
.drafts-loading::before {
    content: '';
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}
```

Then append these new rules:

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

- [ ] **Step 3: Run the full CI check**

```bash
npm run lint && npm run type-check && npm run test -- --reporter=verbose 2>&1 | tail -20
```

Expected: All 143 tests pass, no lint/type errors, no build errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DraftsPage.tsx src/pages/DraftsPage.css
git commit -m "feat: replace DraftsPage spinner with shimmer skeleton"
```

---

## Acceptance Criteria (manual browser check after both tasks)

Start dev server: `npm run dev`. Open DevTools → Network → throttle to Slow 3G.

1. `/post/1` — title-line + 3 meta lines + 5 body lines skeleton visible during load; replaced by real post on completion.
2. `/drafts` — 3 skeleton list items visible during load; replaced by real drafts on completion.
3. Dark mode (`[data-theme="dark"]`): skeletons have readable contrast.
4. Mobile (≤768px): no layout breakage.
