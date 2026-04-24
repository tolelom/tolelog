# Toast + Centralized Error Handler — Design Spec

**Date**: 2026-04-24
**Status**: Approved, ready for implementation planning
**Scope**: `tolelog/` React frontend only (no backend changes)

## 1. Goal & Context

Tolelog frontend currently has **10 silent failure sites** and **1 `alert()` call**, leading to inconsistent UX. This spec introduces a toast notification system and a centralized error-handling policy that classifies each failure site explicitly (notify vs. stay silent).

**Non-goals**: Backend changes, error tracking service integration (Sentry etc.), retry UI, toast history/undo actions.

## 2. Decisions Summary

| Topic | Decision |
|---|---|
| Implementation | Self-built (~100 LOC TSX + CSS), no new dependencies |
| Semantic levels | `success` / `error` / `info` (3 levels, no `warning`) |
| Position | Bottom-right desktop; bottom full-width on `max-width: 768px` |
| Stack limit | 3 simultaneous; 4th push evicts oldest |
| Duration | `success` 3s / `info` 4s / `error` 6s; `×` dismiss button; `hover` pauses timer; `Esc` dismisses most recent |
| Accessibility | `success`/`info` → `aria-live="polite"`; `error` → `aria-live="assertive"` |
| API surface | `useToast()` hook (in-component) + `notify` singleton (utils) |
| Spec location | `tolelog/docs/superpowers/specs/` |
| Test scope | Queue/eviction, timers, hover-pause, 401 integration |

## 3. Architecture

```
src/
├── context/
│   ├── ToastContext.ts          # Type definitions + React Context
│   └── ToastProvider.tsx        # State, timers, notify singleton registration
├── components/
│   ├── Toast.tsx                # Individual toast (pure, props-driven)
│   ├── Toast.css                # CSS variables, dark/light via [data-theme]
│   ├── ToastContainer.tsx       # Layout, portal to body, aria-live regions
│   └── __tests__/
│       ├── ToastProvider.test.tsx
│       └── Toast.test.tsx
├── hooks/
│   ├── useToast.ts
│   └── __tests__/
│       └── useToast.test.ts
└── utils/
    └── notify.ts                # Singleton for non-React call sites
```

**Dependency direction**: `components → context/hooks → utils`. `notify.ts` has no React imports (plain TS module).

**Single responsibility**:
- `ToastProvider` is the single source of truth for queue state + timers.
- `Toast` is stateless UI; hover pause is reported upward via callbacks.
- `ToastContainer` handles layout + `createPortal(..., document.body)` only.
- `notify.ts` holds an internal `dispatchFn | null` that the Provider registers on mount and unregisters on unmount.

## 4. Data Structures

```ts
// src/context/ToastContext.ts
export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;           // crypto.randomUUID() — for React key + dismiss lookup
  type: ToastType;
  message: string;
  createdAt: number;    // Date.now() for sort/debug
  duration: number;     // ms; resolved from type when pushed
}

export interface ToastOptions {
  duration?: number;    // override default
}

export interface ToastApi {
  success(message: string, options?: ToastOptions): string;   // returns id
  error(message: string, options?: ToastOptions): string;
  info(message: string, options?: ToastOptions): string;
  dismiss(id: string): void;
  dismissAll(): void;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  toast: ToastApi;
}
```

**Defaults** (constants in `ToastProvider`):
```ts
const DURATIONS: Record<ToastType, number> = { success: 3000, info: 4000, error: 6000 };
const MAX_STACK = 3;
```

## 5. API Surface

### 5.1 In-component (hook)

```tsx
import { useToast } from '@/hooks/useToast';

function MyButton() {
  const { toast } = useToast();
  const onClick = async () => {
    try {
      await POST_API.create(...);
      toast.success('게시글이 저장되었습니다');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다');
    }
  };
}
```

### 5.2 Outside components (singleton)

```ts
// src/utils/notify.ts
import { notify } from '@/utils/notify';

// inside authenticatedFetch 401 branch:
notify.error('세션이 만료되었습니다. 다시 로그인해주세요.');
```

**Singleton contract** (`notify.ts`):
- `notify.success/error/info(message, options?)` — calls registered dispatch; if none registered, calls `console.warn('[notify] ToastProvider not mounted')` and returns `''` (empty id).
- `notify._register(dispatch: ToastApi)` / `notify._unregister()` — called by `ToastProvider` useEffect on mount/unmount. Underscore prefix signals internal use.
- `notify.dismiss(id) / dismissAll()` — same pattern.

## 6. Provider Behavior

### 6.1 Queue

- New toast: `setToasts(prev => [...prev, item].slice(-MAX_STACK))` — if >3, drop the oldest.
- Rendering order in `ToastContainer`: newest at **bottom** of the stack (closest to screen edge), because bottom-right positioning means the user's eye lands on the most recent one first.

### 6.2 Timers

- When a toast is pushed, start a `setTimeout(() => dismiss(id), duration)`.
- Store timers in a `Map<string, number>` ref. On dismiss (manual or auto), clear timer and splice from array.
- **Hover pause**: `Toast` calls `onHoverStart(id)` → Provider clears that toast's timer; `onHoverEnd(id)` → restart with remaining duration. Track `remainingMs` in a ref keyed by id.
- **ESC key**: Provider registers a `keydown` listener that dismisses `toasts[toasts.length - 1]`.

### 6.3 Cleanup

- On unmount: clear all timers, remove `keydown` listener, `notify._unregister()`.

## 7. Styling

`Toast.css`:

```css
.toast {
  display: flex; align-items: start; gap: 0.5rem;
  padding: 0.75rem 1rem; border-radius: 8px;
  background: var(--toast-bg);
  color: var(--toast-fg);
  border-left: 4px solid var(--toast-accent);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: toast-in 200ms ease-out;
  max-width: 360px; min-width: 240px;
  font-size: 14px;
}
.toast--success { --toast-accent: var(--color-success, #16a34a); }
.toast--error   { --toast-accent: var(--color-error,   #dc2626); }
.toast--info    { --toast-accent: var(--color-info,    #2563eb); }

.toast-container {
  position: fixed; bottom: 1.5rem; right: 1.5rem;
  display: flex; flex-direction: column; gap: 0.5rem;
  z-index: 9999;
  pointer-events: none;   /* only toasts catch events */
}
.toast { pointer-events: auto; }

@media (max-width: 768px) {
  .toast-container {
    left: 1rem; right: 1rem; bottom: 1rem;
  }
  .toast { max-width: none; }
}

@keyframes toast-in {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
```

CSS variables `--toast-bg`/`--toast-fg` map to `--bg-secondary`/`--text-primary` from the existing theme system. Dark mode is automatic via the existing `[data-theme="dark"]` selector.

## 8. Integration Points

`ToastContainer` is mounted once in `App.tsx` alongside `AuthProvider`/`ThemeProvider`:

```tsx
<ThemeProvider>
  <AuthProvider>
    <ToastProvider>
      <BrowserRouter>...</BrowserRouter>
    </ToastProvider>
  </AuthProvider>
</ThemeProvider>
```

## 9. Silent-Failure Site Policy

Each of the 10 identified silent-failure sites is classified explicitly:

| File:Line | Current | New behavior | Rationale |
|---|---|---|---|
| `DraftsPage.tsx:40` | `alert('삭제에 실패했습니다.')` | `toast.error('초안 삭제에 실패했습니다')` | Replace alert; user-initiated action |
| `useLike.ts:18` | `.catch(() => {})` | `toast.error('좋아요 처리에 실패했습니다')` | User click → must surface |
| `EditorPage.tsx:54` | `.catch(() => {})` | `toast.error('저장 실패. 다시 시도해주세요.')` | Explicit save action |
| `HomePage.tsx:37` (series) | `.catch(() => {})` | Remain silent; `console.warn` | Background auxiliary load |
| `HomePage.tsx:46` (tags) | `.catch(() => {})` | Remain silent; `console.warn` | Background auxiliary load |
| `HomePage.tsx:55` (profile) | `.catch(() => {})` | Remain silent; `console.warn` | Background auxiliary load |
| `useSeriesNav.ts:15` | `.catch(() => {})` | Remain silent; `console.warn` | Secondary nav metadata |
| `useSeriesNav.ts:25` | `.catch(() => {})` | Remain silent; `console.warn` | Secondary nav metadata |
| `TagAutocompleteInput.tsx:23` | `.catch(() => {})` | Remain silent; `console.warn` | Autocomplete suggestions |
| `AuthProvider.tsx:107` (logout) | `.catch(() => {})` | Remain silent | Client state already cleared |

**Auto-save policy** (`useAutoSave.ts:44,99,110` — currently `console.error`):
- Success: silent (no toast — would spam on every keystroke).
- Failure: **first failure in a session → `toast.error('자동 저장 실패. 네트워크를 확인해주세요.')`; subsequent failures suppressed until one success occurs.**
- Tracked via a `hasNotifiedFailure` ref.

**401 global handling** (`api.ts:56` in `authenticatedFetch`):
- When refresh-token flow fails: `notify.error('세션이 만료되었습니다. 다시 로그인해주세요.')` + existing redirect logic.
- Implemented in `utils/api.ts` using the `notify` singleton (no React dependency).

## 10. Testing Plan

Per the "standard" scope chosen:

**`useToast.test.ts`**
- Returns the `toast` API object.
- Throws useful error when used outside `ToastProvider`.

**`ToastProvider.test.tsx`**
- Pushing a toast appends it to the queue.
- 4th push evicts the oldest.
- After `duration` ms, toast is auto-removed (use `vi.useFakeTimers()`).
- Hover pause: `onHoverStart` clears the pending timer; `onHoverEnd` restarts; verify toast still auto-dismisses at expected total time.
- `Esc` key dismisses the most recent toast.
- `notify` singleton: calling `notify.error(...)` before provider mounts logs a warning; after mount, triggers the queue.

**`Toast.test.tsx`**
- Renders with correct class per type (`toast--success`, `toast--error`, `toast--info`).
- Close button fires `onDismiss(id)`.
- `error` type container has `aria-live="assertive"`; others `polite`.

**Integration (lightweight)**
- `DraftsPage.test.tsx`: mock `POST_API.delete` to reject; assert `toast.error` was called (spy on `useToast`).
- `api.test.ts` (if it exists, or new): mock 401 response; assert `notify.error` was called.

## 11. Rollout Plan (ordered steps for implementation)

1. **Step A — Core infrastructure**: `ToastContext.ts`, `ToastProvider.tsx`, `Toast.tsx`, `Toast.css`, `ToastContainer.tsx`, `useToast.ts`, `notify.ts`. Mount `ToastProvider` in `App.tsx`. All tests pass.
2. **Step B — 401 integration**: Wire `notify.error` into `authenticatedFetch` 401 branch.
3. **Step C — User-initiated replacements**: Replace silent `.catch` and `alert` at `DraftsPage.tsx:40`, `useLike.ts:18`, `EditorPage.tsx:54`.
4. **Step D — Auto-save policy**: Add `hasNotifiedFailure` ref logic in `useAutoSave.ts`.
5. **Step E — Background silent sites**: Convert `.catch(() => {})` to explicit `.catch((e) => console.warn(...))` at the 6 background sites (no behavior change, just clarity).
6. **Step F — Verify**: `npm run lint && npm run build && npm run test`. Manual smoke test of each replaced site in the browser.

Each step is independently committable.

## 12. Open Risks / Follow-ups (not in scope)

- Error tracking (Sentry) — separate task.
- Toast action buttons (e.g., "Undo delete") — YAGNI, revisit if requested.
- Accessibility audit beyond `aria-live` (screen reader testing) — broader a11y pass in a separate iteration.
- Offline detection + toast — separate concern.
