# Toast + Centralized Error Handler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a self-built toast notification system and apply the explicit failure-handling policy from the spec to the 10 silent-failure sites + 1 alert() call in the tolelog frontend.

**Architecture:** Provider-based state (`ToastProvider`) + React hook (`useToast`) for in-component usage + plain-JS singleton (`notify`) for non-React call sites (e.g., `authenticatedFetch`). Rendered via `createPortal` to `document.body`. 3 types (`success`/`error`/`info`), bottom-right stack of max 3, type-based durations with hover-pause.

**Tech Stack:** React 19, TypeScript, Vite 7, Vitest + @testing-library/react, CSS custom properties (existing theme system). No new npm dependencies.

**Reference spec:** `docs/superpowers/specs/2026-04-24-toast-error-handler-design.md` (committed in `432c6e5`).

**Working directory for all commands:** `tolelog/` (the frontend repo). All file paths in this plan are relative to that root unless noted.

---

## Pre-flight

- [ ] **Step 0: Verify environment**

Run:
```bash
npm install       # ensure deps resolved
npm run lint      # baseline: passes
npm run build     # baseline: passes
npm run test      # baseline: passes (5 test files)
```
Expected: all four commands exit 0. If `test` fails, stop and investigate before starting.

---

## Task 1: Core Types + Context Skeleton

**Files:**
- Create: `src/context/ToastContext.ts`

No test in this task — it's only type declarations. The types are exercised by later tasks' tests.

- [ ] **Step 1: Create ToastContext.ts**

```ts
// src/context/ToastContext.ts
import { createContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
    createdAt: number;
    duration: number;
}

export interface ToastOptions {
    duration?: number;
}

export interface ToastApi {
    success(message: string, options?: ToastOptions): string;
    error(message: string, options?: ToastOptions): string;
    info(message: string, options?: ToastOptions): string;
    dismiss(id: string): void;
    dismissAll(): void;
}

export interface ToastContextValue {
    toasts: ToastItem[];
    toast: ToastApi;
}

const noopApi: ToastApi = {
    success: () => '',
    error: () => '',
    info: () => '',
    dismiss: () => {},
    dismissAll: () => {},
};

export const ToastContext = createContext<ToastContextValue>({
    toasts: [],
    toast: noopApi,
});
```

- [ ] **Step 2: Verify type-check**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/context/ToastContext.ts
git commit -m "feat(toast): add ToastContext types and default values"
```

---

## Task 2: `notify` Singleton (TDD)

**Files:**
- Create: `src/utils/notify.ts`
- Create: `src/utils/__tests__/notify.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/utils/__tests__/notify.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify } from '../notify';
import type { ToastApi } from '../../context/ToastContext';

function makeApi(): ToastApi {
    return {
        success: vi.fn(() => 'sid'),
        error: vi.fn(() => 'eid'),
        info: vi.fn(() => 'iid'),
        dismiss: vi.fn(),
        dismissAll: vi.fn(),
    };
}

describe('notify singleton', () => {
    beforeEach(() => {
        notify._unregister();
        vi.restoreAllMocks();
    });

    it('warns and returns empty string when no provider registered', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const id = notify.error('boom');
        expect(id).toBe('');
        expect(warn).toHaveBeenCalledWith('[notify] ToastProvider not mounted');
    });

    it('dispatches to registered api for success/error/info', () => {
        const api = makeApi();
        notify._register(api);
        expect(notify.success('ok')).toBe('sid');
        expect(notify.error('bad')).toBe('eid');
        expect(notify.info('hi')).toBe('iid');
        expect(api.success).toHaveBeenCalledWith('ok', undefined);
        expect(api.error).toHaveBeenCalledWith('bad', undefined);
        expect(api.info).toHaveBeenCalledWith('hi', undefined);
    });

    it('forwards options', () => {
        const api = makeApi();
        notify._register(api);
        notify.success('ok', { duration: 1000 });
        expect(api.success).toHaveBeenCalledWith('ok', { duration: 1000 });
    });

    it('dismiss and dismissAll route to registered api', () => {
        const api = makeApi();
        notify._register(api);
        notify.dismiss('abc');
        notify.dismissAll();
        expect(api.dismiss).toHaveBeenCalledWith('abc');
        expect(api.dismissAll).toHaveBeenCalled();
    });

    it('unregister disables dispatch', () => {
        const api = makeApi();
        notify._register(api);
        notify._unregister();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        notify.info('hi');
        expect(api.info).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/__tests__/notify.test.ts`
Expected: FAIL — `notify` module not found.

- [ ] **Step 3: Implement notify.ts**

```ts
// src/utils/notify.ts
import type { ToastApi, ToastOptions } from '../context/ToastContext';

let api: ToastApi | null = null;

function warnMissing(): '' {
    console.warn('[notify] ToastProvider not mounted');
    return '';
}

export const notify = {
    success(message: string, options?: ToastOptions): string {
        return api ? api.success(message, options) : warnMissing();
    },
    error(message: string, options?: ToastOptions): string {
        return api ? api.error(message, options) : warnMissing();
    },
    info(message: string, options?: ToastOptions): string {
        return api ? api.info(message, options) : warnMissing();
    },
    dismiss(id: string): void {
        if (api) api.dismiss(id);
        else warnMissing();
    },
    dismissAll(): void {
        if (api) api.dismissAll();
        else warnMissing();
    },
    _register(next: ToastApi): void {
        api = next;
    },
    _unregister(): void {
        api = null;
    },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/__tests__/notify.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/notify.ts src/utils/__tests__/notify.test.ts
git commit -m "feat(toast): add notify singleton for non-React call sites"
```

---

## Task 3: `useToast` Hook (TDD)

**Files:**
- Create: `src/hooks/useToast.ts`
- Create: `src/hooks/__tests__/useToast.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/hooks/__tests__/useToast.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useToast } from '../useToast';
import { ToastContext, type ToastContextValue } from '../../context/ToastContext';

describe('useToast', () => {
    it('returns the value from ToastContext', () => {
        const mockValue: ToastContextValue = {
            toasts: [],
            toast: {
                success: () => 's',
                error: () => 'e',
                info: () => 'i',
                dismiss: () => {},
                dismissAll: () => {},
            },
        };
        const wrapper = ({ children }: { children: ReactNode }) => (
            <ToastContext.Provider value={mockValue}>{children}</ToastContext.Provider>
        );
        const { result } = renderHook(() => useToast(), { wrapper });
        expect(result.current.toast.success('x')).toBe('s');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/hooks/__tests__/useToast.test.tsx`
Expected: FAIL — `useToast` module not found.

- [ ] **Step 3: Implement useToast**

```ts
// src/hooks/useToast.ts
import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';

export function useToast() {
    return useContext(ToastContext);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/hooks/__tests__/useToast.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useToast.ts src/hooks/__tests__/useToast.test.tsx
git commit -m "feat(toast): add useToast hook"
```

---

## Task 4: `Toast` Component (TDD)

**Files:**
- Create: `src/components/Toast.tsx`
- Create: `src/components/Toast.css`
- Create: `src/components/__tests__/Toast.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/__tests__/Toast.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from '../Toast';
import type { ToastItem } from '../../context/ToastContext';

function item(overrides: Partial<ToastItem> = {}): ToastItem {
    return {
        id: '1',
        type: 'success',
        message: 'hello',
        createdAt: Date.now(),
        duration: 3000,
        ...overrides,
    };
}

describe('Toast', () => {
    it('renders message', () => {
        render(<Toast item={item()} onDismiss={() => {}} onHoverStart={() => {}} onHoverEnd={() => {}} />);
        expect(screen.getByText('hello')).toBeInTheDocument();
    });

    it('applies type-specific class', () => {
        const { container } = render(
            <Toast item={item({ type: 'error' })} onDismiss={() => {}} onHoverStart={() => {}} onHoverEnd={() => {}} />
        );
        expect(container.querySelector('.toast--error')).toBeInTheDocument();
    });

    it('calls onDismiss when close button clicked', () => {
        const onDismiss = vi.fn();
        render(<Toast item={item({ id: 'abc' })} onDismiss={onDismiss} onHoverStart={() => {}} onHoverEnd={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: '닫기' }));
        expect(onDismiss).toHaveBeenCalledWith('abc');
    });

    it('calls onHoverStart/onHoverEnd on mouse enter/leave', () => {
        const onHoverStart = vi.fn();
        const onHoverEnd = vi.fn();
        const { container } = render(
            <Toast item={item({ id: 'x' })} onDismiss={() => {}} onHoverStart={onHoverStart} onHoverEnd={onHoverEnd} />
        );
        const toast = container.querySelector('.toast') as HTMLElement;
        fireEvent.mouseEnter(toast);
        expect(onHoverStart).toHaveBeenCalledWith('x');
        fireEvent.mouseLeave(toast);
        expect(onHoverEnd).toHaveBeenCalledWith('x');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/__tests__/Toast.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Toast.tsx**

```tsx
// src/components/Toast.tsx
import type { ToastItem } from '../context/ToastContext';
import './Toast.css';

interface ToastProps {
    item: ToastItem;
    onDismiss: (id: string) => void;
    onHoverStart: (id: string) => void;
    onHoverEnd: (id: string) => void;
}

export function Toast({ item, onDismiss, onHoverStart, onHoverEnd }: ToastProps) {
    return (
        <div
            className={`toast toast--${item.type}`}
            role={item.type === 'error' ? 'alert' : 'status'}
            onMouseEnter={() => onHoverStart(item.id)}
            onMouseLeave={() => onHoverEnd(item.id)}
        >
            <span className="toast__message">{item.message}</span>
            <button
                type="button"
                className="toast__close"
                aria-label="닫기"
                onClick={() => onDismiss(item.id)}
            >
                ×
            </button>
        </div>
    );
}
```

- [ ] **Step 4: Create Toast.css**

```css
/* src/components/Toast.css */
.toast {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-left: 4px solid var(--toast-accent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: toast-in 200ms ease-out;
    max-width: 360px;
    min-width: 240px;
    font-size: 14px;
    pointer-events: auto;
}
.toast--success { --toast-accent: #16a34a; }
.toast--error   { --toast-accent: #dc2626; }
.toast--info    { --toast-accent: #2563eb; }

.toast__message {
    flex: 1;
    line-height: 1.4;
    word-break: break-word;
}

.toast__close {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-secondary, var(--text-primary));
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    border-radius: 4px;
    padding: 0;
}
.toast__close:hover {
    background: rgba(0, 0, 0, 0.08);
}
[data-theme="dark"] .toast__close:hover {
    background: rgba(255, 255, 255, 0.12);
}

@keyframes toast-in {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/components/__tests__/Toast.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/Toast.tsx src/components/Toast.css src/components/__tests__/Toast.test.tsx
git commit -m "feat(toast): add Toast component and styles"
```

---

## Task 5: `ToastContainer` Component (TDD)

**Files:**
- Create: `src/components/ToastContainer.tsx`
- Modify: `src/components/Toast.css` (append container rules)
- Create: `src/components/__tests__/ToastContainer.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/__tests__/ToastContainer.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ToastContainer } from '../ToastContainer';
import type { ToastItem } from '../../context/ToastContext';

function item(overrides: Partial<ToastItem> = {}): ToastItem {
    return { id: '1', type: 'success', message: 'msg', createdAt: 1, duration: 3000, ...overrides };
}

describe('ToastContainer', () => {
    it('renders into document.body via portal', () => {
        render(
            <ToastContainer
                toasts={[item()]}
                onDismiss={() => {}}
                onHoverStart={() => {}}
                onHoverEnd={() => {}}
            />
        );
        const container = document.body.querySelector('.toast-container');
        expect(container).not.toBeNull();
    });

    it('renders one Toast per item', () => {
        render(
            <ToastContainer
                toasts={[item({ id: 'a' }), item({ id: 'b', type: 'error' })]}
                onDismiss={() => {}}
                onHoverStart={() => {}}
                onHoverEnd={() => {}}
            />
        );
        expect(document.body.querySelectorAll('.toast').length).toBe(2);
    });

    it('splits items into polite/assertive aria-live regions', () => {
        render(
            <ToastContainer
                toasts={[item({ id: 'a', type: 'success' }), item({ id: 'b', type: 'error' })]}
                onDismiss={() => {}}
                onHoverStart={() => {}}
                onHoverEnd={() => {}}
            />
        );
        expect(document.body.querySelector('[aria-live="polite"]')).not.toBeNull();
        expect(document.body.querySelector('[aria-live="assertive"]')).not.toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/__tests__/ToastContainer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement ToastContainer.tsx**

```tsx
// src/components/ToastContainer.tsx
import { createPortal } from 'react-dom';
import { Toast } from './Toast';
import type { ToastItem } from '../context/ToastContext';

interface ToastContainerProps {
    toasts: ToastItem[];
    onDismiss: (id: string) => void;
    onHoverStart: (id: string) => void;
    onHoverEnd: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss, onHoverStart, onHoverEnd }: ToastContainerProps) {
    const polite = toasts.filter(t => t.type !== 'error');
    const assertive = toasts.filter(t => t.type === 'error');

    return createPortal(
        <div className="toast-container">
            <div aria-live="polite" aria-atomic="false" className="toast-region">
                {polite.map(t => (
                    <Toast key={t.id} item={t} onDismiss={onDismiss} onHoverStart={onHoverStart} onHoverEnd={onHoverEnd} />
                ))}
            </div>
            <div aria-live="assertive" aria-atomic="false" className="toast-region">
                {assertive.map(t => (
                    <Toast key={t.id} item={t} onDismiss={onDismiss} onHoverStart={onHoverStart} onHoverEnd={onHoverEnd} />
                ))}
            </div>
        </div>,
        document.body
    );
}
```

- [ ] **Step 4: Append container styles to Toast.css**

Append to `src/components/Toast.css`:

```css
.toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 9999;
    pointer-events: none;
}
.toast-region {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

@media (max-width: 768px) {
    .toast-container {
        left: 1rem;
        right: 1rem;
        bottom: 1rem;
    }
    .toast {
        max-width: none;
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- src/components/__tests__/ToastContainer.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/ToastContainer.tsx src/components/Toast.css src/components/__tests__/ToastContainer.test.tsx
git commit -m "feat(toast): add ToastContainer with portal and aria-live regions"
```

---

## Task 6: `ToastProvider` (TDD — Queue, Timers, Hover Pause, ESC)

**Files:**
- Create: `src/context/ToastProvider.tsx`
- Create: `src/context/__tests__/ToastProvider.test.tsx`

This is the largest task. Multiple tests, then single implementation that satisfies all of them.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/context/__tests__/ToastProvider.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider } from '../ToastProvider';
import { useToast } from '../../hooks/useToast';
import { notify } from '../../utils/notify';

function Consumer() {
    const { toast, toasts } = useToast();
    return (
        <>
            <button onClick={() => toast.success('ok')}>s</button>
            <button onClick={() => toast.error('bad')}>e</button>
            <button onClick={() => toast.info('hi')}>i</button>
            <div data-testid="count">{toasts.length}</div>
        </>
    );
}

describe('ToastProvider', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
        notify._unregister();
    });

    it('appends toasts to the queue', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('s'));
        fireEvent.click(screen.getByText('e'));
        expect(screen.getByTestId('count').textContent).toBe('2');
    });

    it('caps the queue at 3, evicting oldest', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        const btn = screen.getByText('s');
        fireEvent.click(btn);
        fireEvent.click(btn);
        fireEvent.click(btn);
        fireEvent.click(btn);
        expect(screen.getByTestId('count').textContent).toBe('3');
    });

    it('auto-dismisses a success toast after 3000ms', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('s'));
        expect(screen.getByTestId('count').textContent).toBe('1');
        act(() => { vi.advanceTimersByTime(3000); });
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('auto-dismisses an error toast after 6000ms (not 3000ms)', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('e'));
        act(() => { vi.advanceTimersByTime(3000); });
        expect(screen.getByTestId('count').textContent).toBe('1');
        act(() => { vi.advanceTimersByTime(3000); });
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('hover pauses the timer, and leaving restarts with remaining duration', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('s'));
        const toast = document.body.querySelector('.toast') as HTMLElement;
        act(() => { vi.advanceTimersByTime(1000); });
        fireEvent.mouseEnter(toast);
        act(() => { vi.advanceTimersByTime(5000); });
        expect(screen.getByTestId('count').textContent).toBe('1');
        fireEvent.mouseLeave(toast);
        act(() => { vi.advanceTimersByTime(1999); });
        expect(screen.getByTestId('count').textContent).toBe('1');
        act(() => { vi.advanceTimersByTime(1); });
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('ESC key dismisses the most recent toast', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('s'));
        fireEvent.click(screen.getByText('s'));
        expect(screen.getByTestId('count').textContent).toBe('2');
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.getByTestId('count').textContent).toBe('1');
    });

    it('registers notify singleton so external calls push toasts', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        act(() => { notify.error('from util'); });
        expect(screen.getByTestId('count').textContent).toBe('1');
        expect(screen.getByText('from util')).toBeInTheDocument();
    });

    it('close button dismisses specific toast', () => {
        render(
            <ToastProvider>
                <Consumer />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('s'));
        fireEvent.click(screen.getByRole('button', { name: '닫기' }));
        expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('custom duration overrides default', () => {
        function Custom() {
            const { toast, toasts } = useToast();
            return (
                <>
                    <button onClick={() => toast.success('ok', { duration: 100 })}>custom</button>
                    <div data-testid="count">{toasts.length}</div>
                </>
            );
        }
        render(
            <ToastProvider>
                <Custom />
            </ToastProvider>
        );
        fireEvent.click(screen.getByText('custom'));
        act(() => { vi.advanceTimersByTime(100); });
        expect(screen.getByTestId('count').textContent).toBe('0');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/context/__tests__/ToastProvider.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement ToastProvider**

```tsx
// src/context/ToastProvider.tsx
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    ToastContext,
    type ToastApi,
    type ToastItem,
    type ToastOptions,
    type ToastType,
} from './ToastContext';
import { ToastContainer } from '../components/ToastContainer';
import { notify } from '../utils/notify';

const DURATIONS: Record<ToastType, number> = { success: 3000, info: 4000, error: 6000 };
const MAX_STACK = 3;

interface TimerRecord {
    timeoutId: ReturnType<typeof setTimeout>;
    startedAt: number;
    remaining: number;
}

interface ToastProviderProps {
    children: ReactNode;
}

function makeId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timersRef = useRef<Map<string, TimerRecord>>(new Map());

    const dismiss = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer.timeoutId);
            timersRef.current.delete(id);
        }
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        timersRef.current.forEach(t => clearTimeout(t.timeoutId));
        timersRef.current.clear();
        setToasts([]);
    }, []);

    const scheduleDismiss = useCallback((id: string, duration: number) => {
        const timeoutId = setTimeout(() => {
            timersRef.current.delete(id);
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
        timersRef.current.set(id, { timeoutId, startedAt: Date.now(), remaining: duration });
    }, []);

    const push = useCallback((type: ToastType, message: string, options?: ToastOptions): string => {
        const id = makeId();
        const duration = options?.duration ?? DURATIONS[type];
        const item: ToastItem = { id, type, message, createdAt: Date.now(), duration };

        setToasts(prev => {
            const next = [...prev, item];
            if (next.length <= MAX_STACK) return next;
            // Evict oldest timers
            const toEvict = next.slice(0, next.length - MAX_STACK);
            toEvict.forEach(ev => {
                const t = timersRef.current.get(ev.id);
                if (t) {
                    clearTimeout(t.timeoutId);
                    timersRef.current.delete(ev.id);
                }
            });
            return next.slice(-MAX_STACK);
        });
        scheduleDismiss(id, duration);
        return id;
    }, [scheduleDismiss]);

    const onHoverStart = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (!timer) return;
        clearTimeout(timer.timeoutId);
        const elapsed = Date.now() - timer.startedAt;
        const remaining = Math.max(0, timer.remaining - elapsed);
        timersRef.current.set(id, { ...timer, timeoutId: 0 as unknown as ReturnType<typeof setTimeout>, remaining });
    }, []);

    const onHoverEnd = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (!timer) return;
        scheduleDismiss(id, timer.remaining);
    }, [scheduleDismiss]);

    const api = useMemo<ToastApi>(() => ({
        success: (message, options) => push('success', message, options),
        error: (message, options) => push('error', message, options),
        info: (message, options) => push('info', message, options),
        dismiss,
        dismissAll,
    }), [push, dismiss, dismissAll]);

    // Register singleton
    useEffect(() => {
        notify._register(api);
        return () => notify._unregister();
    }, [api]);

    // ESC key dismisses most recent
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            setToasts(prev => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                const timer = timersRef.current.get(last.id);
                if (timer) {
                    clearTimeout(timer.timeoutId);
                    timersRef.current.delete(last.id);
                }
                return prev.slice(0, -1);
            });
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Cleanup all timers on unmount
    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach(t => clearTimeout(t.timeoutId));
            timers.clear();
        };
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, toast: api }}>
            {children}
            <ToastContainer
                toasts={toasts}
                onDismiss={dismiss}
                onHoverStart={onHoverStart}
                onHoverEnd={onHoverEnd}
            />
        </ToastContext.Provider>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/context/__tests__/ToastProvider.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 5: Run full test suite to confirm no regressions**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/context/ToastProvider.tsx src/context/__tests__/ToastProvider.test.tsx
git commit -m "feat(toast): add ToastProvider with queue, timers, hover pause, ESC"
```

---

## Task 7: Mount `ToastProvider` in `main.tsx`

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Update main.tsx**

Current content (for reference):
```tsx
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import {AuthProvider} from "./context/AuthProvider";
import {ThemeProvider} from "./context/ThemeProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import {initKatex} from "./utils/markdownParser";

initKatex().then(() => {
    import('katex/dist/katex.min.css');
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <ThemeProvider>
                <AuthProvider>
                    <App/>
                </AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    </StrictMode>,
)
```

Replace with:

```tsx
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App'
import {AuthProvider} from "./context/AuthProvider";
import {ThemeProvider} from "./context/ThemeProvider";
import {ToastProvider} from "./context/ToastProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import {initKatex} from "./utils/markdownParser";

initKatex().then(() => {
    import('katex/dist/katex.min.css');
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <ThemeProvider>
                <ToastProvider>
                    <AuthProvider>
                        <App/>
                    </AuthProvider>
                </ToastProvider>
            </ThemeProvider>
        </ErrorBoundary>
    </StrictMode>,
)
```

Rationale for ordering: `ToastProvider` wraps `AuthProvider` so that the `notify` singleton is registered before any auth-related side effect might try to use it (e.g., 401 during initial token refresh).

- [ ] **Step 2: Verify build + tests**

Run: `npm run build && npm run test`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat(toast): mount ToastProvider in app root"
```

---

## Task 8: 401 Integration — `authenticatedFetch` uses `notify.error`

**Files:**
- Modify: `src/utils/api.ts` (lines 78-80 area)
- Create: `src/utils/__tests__/api.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/__tests__/api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notify } from '../notify';

describe('authenticatedFetch 401 handling', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        localStorage.clear();
        notify._unregister();
    });
    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('calls notify.error when refresh fails on 401', async () => {
        const errorSpy = vi.fn(() => 'id');
        notify._register({
            success: () => '',
            error: errorSpy,
            info: () => '',
            dismiss: () => {},
            dismissAll: () => {},
        });

        // No refresh token stored → tryRefreshToken returns null
        globalThis.fetch = vi.fn(() =>
            Promise.resolve(new Response(null, { status: 401 }))
        ) as typeof fetch;

        // Dynamic import to ensure the test applies after mocking
        const { POST_API } = await import('../api');
        await expect(POST_API.deletePost(1, 'stale-token')).rejects.toThrow();

        expect(errorSpy).toHaveBeenCalledWith('세션이 만료되었습니다. 다시 로그인해주세요.', undefined);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/__tests__/api.test.ts`
Expected: FAIL — notify.error not called (current code just throws).

- [ ] **Step 3: Modify api.ts**

In `src/utils/api.ts`, find the block ending at the `'인증이 만료되었습니다'` throw (currently around lines 78-80):

```ts
        const err: ApiError = new Error('인증이 만료되었습니다');
        err.status = 401;
        throw err;
```

Replace with:

```ts
        notify.error('세션이 만료되었습니다. 다시 로그인해주세요.');
        const err: ApiError = new Error('인증이 만료되었습니다');
        err.status = 401;
        throw err;
```

Add at the top of the file (after the existing import block on lines 1-2):

```ts
import { notify } from './notify';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/__tests__/api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/api.ts src/utils/__tests__/api.test.ts
git commit -m "feat(toast): surface expired session via notify.error on 401"
```

---

## Task 9: Replace `alert()` in `DraftsPage.tsx`

**Files:**
- Modify: `src/pages/DraftsPage.tsx`

- [ ] **Step 1: Update DraftsPage.tsx**

Add the useToast import after the existing React import (line 1 area):

```tsx
import { useToast } from '../hooks/useToast';
```

Inside the `DraftsPage` component function (just below `const { token } = useContext(AuthContext);`), add:

```tsx
const { toast } = useToast();
```

Replace the `handleDelete` body (currently at lines 35-42):

```tsx
    const handleDelete = useCallback((id: number) => {
        if (!token || !window.confirm('이 초안을 삭제하시겠습니까?')) return;
        setDeletingId(id);
        POST_API.deletePost(id, token)
            .then(() => setDrafts(prev => prev.filter(d => d.id !== id)))
            .catch(() => alert('삭제에 실패했습니다.'))
            .finally(() => setDeletingId(null));
    }, [token]);
```

With:

```tsx
    const handleDelete = useCallback((id: number) => {
        if (!token || !window.confirm('이 초안을 삭제하시겠습니까?')) return;
        setDeletingId(id);
        POST_API.deletePost(id, token)
            .then(() => {
                setDrafts(prev => prev.filter(d => d.id !== id));
                toast.success('초안이 삭제되었습니다');
            })
            .catch(() => toast.error('초안 삭제에 실패했습니다'))
            .finally(() => setDeletingId(null));
    }, [token, toast]);
```

- [ ] **Step 2: Verify type-check + lint + tests**

Run: `npm run type-check && npm run lint && npm run test`
Expected: exit 0 for all three.

- [ ] **Step 3: Commit**

```bash
git add src/pages/DraftsPage.tsx
git commit -m "feat(toast): replace alert() with toast in draft deletion flow"
```

---

## Task 10: Toast on `useLike` User-Click Failure

**Files:**
- Modify: `src/hooks/useLike.ts`

**Note:** The spec referenced line 18, but line 18 is the *background* status fetch (on mount). The actual *user click* is `handleLike` at line 22-33. Per spec policy ("user-initiated action → toast"), the toast goes in `handleLike`'s catch block. Line 18 (background fetch) stays silent but gets explicit `console.warn` in Task 13.

- [ ] **Step 1: Update useLike.ts**

Add import at the top:

```ts
import { notify } from '../utils/api';
```

Wait — `notify` is in `utils/notify.ts`, not `utils/api.ts`. Use:

```ts
import { notify } from '../utils/notify';
```

Replace the `handleLike` function body (currently lines 22-33):

```ts
    const handleLike = async () => {
        if (!token || !postId || likeLoading) return;
        setLikeLoading(true);
        try {
            const res = await LIKE_API.toggle(postId, token);
            if (res.data) {
                setLiked(res.data.liked);
                setLikeCount(res.data.like_count);
            }
        } catch { /* ignore */ }
        finally { setLikeLoading(false); }
    };
```

With:

```ts
    const handleLike = async () => {
        if (!token || !postId || likeLoading) return;
        setLikeLoading(true);
        try {
            const res = await LIKE_API.toggle(postId, token);
            if (res.data) {
                setLiked(res.data.liked);
                setLikeCount(res.data.like_count);
            }
        } catch {
            notify.error('좋아요 처리에 실패했습니다');
        } finally {
            setLikeLoading(false);
        }
    };
```

(The hook could also use `useToast()`, but it's a hook already and adding another hook call is fine; the singleton `notify` is chosen here to keep the change minimal.)

- [ ] **Step 2: Verify**

Run: `npm run type-check && npm run test`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLike.ts
git commit -m "feat(toast): surface like-toggle failure with toast"
```

---

## Task 11: Toast on `EditorPage` Save Success/Failure

**Files:**
- Modify: `src/pages/EditorPage.tsx`

**Clarification on spec:** the spec's "EditorPage.tsx:54" reference is misleading. Line 54 is the *background* `SERIES_API.getUserSeries` load — it must stay silent (handled in Task 13). The actual **save flow** is `handleSubmit` around lines 231-284 which already has `setError`/`setSuccess` inline state. This task **adds** toasts alongside the existing inline state (not a replacement) so both signals reinforce each other without removing working UX.

- [ ] **Step 1: Add useToast import**

At the top of `src/pages/EditorPage.tsx`, add:

```tsx
import { useToast } from '../hooks/useToast';
```

- [ ] **Step 2: Initialize hook inside component**

Inside the `EditorPage` component function, alongside other hooks (e.g., right after `const navigate = useNavigate();` or wherever other hook calls live near the top of the component body), add:

```tsx
const { toast } = useToast();
```

- [ ] **Step 3: Surface save success via toast**

Find the success branch around line 269-270:

```tsx
            const successMsg = isEditMode ? '글이 수정되었습니다!' : '글이 저장되었습니다!';
            setSuccess(successMsg);
            clearDraft();
```

Insert a `toast.success` call right after `setSuccess`:

```tsx
            const successMsg = isEditMode ? '글이 수정되었습니다!' : '글이 저장되었습니다!';
            setSuccess(successMsg);
            toast.success(successMsg);
            clearDraft();
```

- [ ] **Step 4: Surface save failure via toast**

Find the catch block around line 275-284:

```tsx
        } catch (err: unknown) {
            const apiErr = err as { status?: number; message?: string };
            if (apiErr.status === 401) {
                setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
                navigate('/login');
                return;
            }
            setError(err instanceof Error ? err.message : '글 저장에 실패했습니다');
            setIsSaving(false);
        }
```

Replace the non-401 branch to additionally fire a toast. The 401 branch intentionally does NOT toast — `notify.error` has already fired from inside `authenticatedFetch` (Task 8), so adding another would duplicate.

```tsx
        } catch (err: unknown) {
            const apiErr = err as { status?: number; message?: string };
            if (apiErr.status === 401) {
                setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
                navigate('/login');
                return;
            }
            const errMsg = err instanceof Error ? err.message : '글 저장에 실패했습니다';
            setError(errMsg);
            toast.error(errMsg);
            setIsSaving(false);
        }
```

- [ ] **Step 5: Verify**

Run: `npm run type-check && npm run lint && npm run test`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/pages/EditorPage.tsx
git commit -m "feat(toast): surface post save success/failure in editor"
```

---

## Task 12: Auto-Save Notification Policy

**Files:**
- Modify: `src/hooks/useAutoSave.ts`

Per spec §9 auto-save policy: server-save failure shows toast only on the **first** failure in a session; subsequent failures are suppressed until a successful save resets the flag.

- [ ] **Step 1: Update useAutoSave.ts**

Add import:

```ts
import { notify } from '../utils/notify';
```

Add a ref inside `useAutoSave`:

```ts
const hasNotifiedFailureRef = useRef(false);
```

Replace the server save `useEffect` body (currently lines 69-89):

```ts
    // server save side effect
    useEffect(() => {
        if (!serverSave?.enabled) return;

        if (serverSaveTimeoutRef.current) {
            clearTimeout(serverSaveTimeoutRef.current);
        }

        serverSaveTimeoutRef.current = setTimeout(async () => {
            try {
                await serverSave.onSave(formData);
            } catch {
                // server save failure is silent — localStorage backup is still valid
            }
        }, serverSave.delay ?? 5000);

        return () => {
            if (serverSaveTimeoutRef.current) {
                clearTimeout(serverSaveTimeoutRef.current);
            }
        };
    }, [formData, serverSave?.enabled, serverSave?.delay, serverSave?.onSave]);
```

With:

```ts
    // server save side effect
    useEffect(() => {
        if (!serverSave?.enabled) return;

        if (serverSaveTimeoutRef.current) {
            clearTimeout(serverSaveTimeoutRef.current);
        }

        serverSaveTimeoutRef.current = setTimeout(async () => {
            try {
                await serverSave.onSave(formData);
                hasNotifiedFailureRef.current = false;
            } catch {
                if (!hasNotifiedFailureRef.current) {
                    notify.error('자동 저장 실패. 네트워크를 확인해주세요.');
                    hasNotifiedFailureRef.current = true;
                }
            }
        }, serverSave.delay ?? 5000);

        return () => {
            if (serverSaveTimeoutRef.current) {
                clearTimeout(serverSaveTimeoutRef.current);
            }
        };
    }, [formData, serverSave?.enabled, serverSave?.delay, serverSave?.onSave]);
```

- [ ] **Step 2: Verify existing useAutoSave tests still pass**

Run: `npm run test -- src/hooks/__tests__/useAutoSave.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAutoSave.ts
git commit -m "feat(toast): notify once per session on auto-save failure"
```

---

## Task 13: Convert Background `.catch(() => {})` to Explicit `console.warn`

**Files to modify:**
- `src/pages/HomePage.tsx` (lines 37, 46, 55)
- `src/hooks/useSeriesNav.ts` (lines 15, 25)
- `src/components/TagAutocompleteInput.tsx` (line 23)
- `src/pages/EditorPage.tsx` (line 54)
- `src/context/AuthProvider.tsx` (line 107 — logout)
- `src/hooks/useLike.ts` (line 18 — background status fetch)

For each site, replace `.catch(() => {})` with `.catch((err) => console.warn('<context>:', err));` where `<context>` is a short human-readable description. Current AuthProvider logout stays silent but should log too so we see it in dev tools.

- [ ] **Step 1: HomePage.tsx — 3 sites**

Modify each of lines ~37, ~46, ~55:

- Line ~37 (series load): `.catch((err) => console.warn('home: failed to load series:', err));`
- Line ~46 (tags load): `.catch((err) => console.warn('home: failed to load tags:', err));`
- Line ~55 (profile load): `.catch((err) => console.warn('home: failed to load profile:', err));`

- [ ] **Step 2: useSeriesNav.ts — 2 sites**

Lines ~15 and ~25: replace with `.catch((err) => console.warn('series-nav: failed to load:', err));`.

- [ ] **Step 3: TagAutocompleteInput.tsx — 1 site**

Line ~23: `.catch((err) => console.warn('tag-autocomplete: failed to load:', err));`.

- [ ] **Step 4: EditorPage.tsx — 1 site (line 54 user-series load)**

```tsx
        SERIES_API.getUserSeries(userId, { signal: controller.signal })
            .then(res => { if (res.status === 'success') setUserSeries(res.data || []); })
            .catch((err) => console.warn('editor: failed to load user series:', err));
```

- [ ] **Step 5: AuthProvider.tsx — logout**

Line 107:

```tsx
            AUTH_API.logout(currentToken).catch((err) => console.warn('auth: logout request failed:', err));
```

- [ ] **Step 6: useLike.ts — background status fetch**

Line ~18:

```ts
        LIKE_API.getStatus(postId, { signal: controller.signal, token })
            .then(res => { if (res.data) setLiked(res.data.liked); })
            .catch((err) => console.warn('like: failed to load status:', err));
```

- [ ] **Step 7: Verify type-check, lint, tests**

Run: `npm run type-check && npm run lint && npm run test`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/pages/HomePage.tsx src/hooks/useSeriesNav.ts src/components/TagAutocompleteInput.tsx src/pages/EditorPage.tsx src/context/AuthProvider.tsx src/hooks/useLike.ts
git commit -m "chore(toast): make background failures explicit with console.warn"
```

---

## Task 14: Final Verification & Manual Smoke Test

- [ ] **Step 1: Full CI-equivalent check**

Run:
```bash
npm run lint
npm run type-check
npm run build
npm run test
```
Expected: all exit 0.

- [ ] **Step 2: Manual smoke test in dev browser**

Start: `npm run dev` and open http://localhost:5173.

For each of the following, confirm a toast appears at the bottom-right (or bottom full-width on mobile viewport):

- Log in successfully → no toast required; this was not a change.
- Log in with wrong password → existing error UI in `LoginBox` (not part of this change).
- **Delete a draft while offline** (throttle network in devtools) → `error` toast "초안 삭제에 실패했습니다".
- **Click like while offline** → `error` toast "좋아요 처리에 실패했습니다".
- **Let session expire / clear token manually** → call a protected endpoint → `error` toast "세션이 만료되었습니다. 다시 로그인해주세요.".
- **Type in the editor while offline** → within 5-10 seconds, a single `error` toast "자동 저장 실패. 네트워크를 확인해주세요." should appear. Type more → no additional toast.
- **Reconnect network + successful auto-save** → no toast (silent). Go offline again → toast should re-appear exactly once.
- **Click the `×` button** on any toast → immediately dismisses.
- **Hover a toast** → timer pauses (stays > its default duration).
- **Press ESC** → most recent toast dismisses.
- **Trigger 4+ toasts in rapid succession** → only 3 are visible at once; oldest evicted.

If any of the above fails, the plan is not yet complete — debug, add a regression test, and recommit under the relevant Task.

- [ ] **Step 3: Final commit (if any smoke-test fixes)**

If manual smoke test uncovered issues, fix them, add a regression test, and commit as: `fix(toast): <short-description>`.

Otherwise no-op.

---

## Summary — Files Touched

**Created (12):**
- `src/context/ToastContext.ts`
- `src/context/ToastProvider.tsx`
- `src/context/__tests__/ToastProvider.test.tsx`
- `src/components/Toast.tsx`
- `src/components/Toast.css`
- `src/components/ToastContainer.tsx`
- `src/components/__tests__/Toast.test.tsx`
- `src/components/__tests__/ToastContainer.test.tsx`
- `src/hooks/useToast.ts`
- `src/hooks/__tests__/useToast.test.tsx`
- `src/utils/notify.ts`
- `src/utils/__tests__/notify.test.ts`
- `src/utils/__tests__/api.test.ts`

**Modified (8):**
- `src/main.tsx`
- `src/utils/api.ts`
- `src/pages/DraftsPage.tsx`
- `src/pages/EditorPage.tsx`
- `src/pages/HomePage.tsx`
- `src/hooks/useLike.ts`
- `src/hooks/useAutoSave.ts`
- `src/hooks/useSeriesNav.ts`
- `src/components/TagAutocompleteInput.tsx`
- `src/context/AuthProvider.tsx`

**Commits:** One per task (Tasks 1-13), optionally one fix commit in Task 14. Each is independently revertable.
