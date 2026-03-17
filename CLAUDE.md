# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tolelog is a Korean-language markdown blog platform. This repository contains only the **React frontend**; the backend is a separate Go Fiber API server (in `../fiber_api_server/`).

## Development Commands

```bash
npm run dev         # Start dev server (port 5173, proxies /api → localhost:3000, strips /api prefix)
npm run build       # Type-check (tsc --noEmit) then Vite production build (outputs to ./dist)
npm run lint        # ESLint flat config (no-unused-vars ignores ^[A-Z_] pattern)
npm run type-check  # TypeScript type checking only (tsc --noEmit)
npm run preview     # Preview production build locally
```

Environment: Node.js 20, npm. Copy `.env.example` to `.env` and set `VITE_API_URL` (defaults to `http://localhost:3000`).

Vite config includes manual chunk splitting: `highlight.js/lib/common` is extracted into a separate `hljs` chunk.

## Architecture

**Stack:** React 19 + Vite 7 + TypeScript + React Router 7. All source files are `.ts`/`.tsx`.

**State management:** React Context API via `AuthContext`/`AuthProvider` and `ThemeContext`/`ThemeProvider`. Auth tokens, user info, and theme preference persisted in `localStorage` using keys from `src/utils/constants.ts`.

**Type definitions:** `src/types/index.ts` — shared interfaces for `User`, `Post`, `Comment`, `AuthData`, API response types, etc.

**API layer:** `src/utils/api.ts` exports namespaced API objects, each with async functions using `fetch`. Includes `authenticatedFetch` helper with automatic token refresh on 401.
- `POST_API` — post CRUD, search, pagination, tag filtering
- `AUTH_API` — `login()`, `register()`, `refresh()`
- `IMAGE_API` — FormData upload with Bearer token
- `USER_API` — `getProfile()`, `uploadAvatar()`
- `COMMENT_API` — `getComments()`, `createComment()`, `deleteComment()`

**Shared utilities:**
- `src/utils/constants.ts` — `API_BASE_URL`, `STORAGE_KEYS`, `AUTO_SAVE_DELAY_MS`, `IMAGE_CONSTRAINTS`
- `src/utils/markdownParser.ts` — custom markdown parser with `parseBlocks()`, `renderBlock()`, `renderMarkdown()`, `parseInline()`. Supports headings, lists, tables, code blocks (highlight.js), blockquotes, images, checklists, footnotes, and KaTeX math (`$inline$`, `$$block$$`).
- `src/utils/markdown.ts` — re-exports `renderMarkdown` from markdownParser
- `src/utils/imageUpload.ts` — image validation, canvas-based compression, server upload wrapper
- `src/utils/format.ts` — `stripMarkdown()`, `formatDate()`

**Key components:**
- `BlockEditor` — Typora/Notion-style block-based inline markdown editor with `forwardRef`. Exposes `wrapSelection()` via `useImperativeHandle`. Supports Ctrl+B/I/K/\` shortcuts. Images uploaded to server (Base64 as fallback).
- `AuthForm` — generic field-driven form for login/register. Used by `LoginBox` and `RegisterBox`.
- `CommentSection` — comment list display and creation for posts.
- `ErrorBoundary` — React error boundary with fallback UI.
- `PrivateRoute` — redirects to `/login` if no auth token.
- `ThemeToggle` — dark/light mode toggle button.
- `ImageUploadButton` — image upload with compression via `IMAGE_API`.

**Routing:** React Router DOM with `BrowserRouter` in `App.tsx`. Pages are lazy-loaded with `React.lazy` + `Suspense`.

**Key routes:**
| Path | Component | Auth |
|------|-----------|------|
| `/` | HomePage | No |
| `/post/:postId` | PostDetailPage | No |
| `/user/:userId` | UserProfilePage | No |
| `/login`, `/register` | LoginPage, RegisterPage | No |
| `/editor` | EditorPage (new post) | Yes |
| `/editor/:postId` | EditorPage (edit) | Yes |
| `/editor_private` | EditorPage (private post) | Yes |

**Editor:** Block-based inline markdown editor via `BlockEditor`. Toolbar with format buttons and keyboard shortcuts (Ctrl+B/I/K/\`). Drafts auto-saved to `localStorage` via `useAutoSave` hook (1s debounce). Separate storage keys for new posts vs. editing existing posts.

**Theming:** CSS custom properties defined in `src/index.css` (`:root` for light, `[data-theme="dark"]` for dark). All CSS files use variables like `--bg-primary`, `--text-primary`, `--accent-color`.

## Backend API (for reference)

The Go Fiber backend exposes (all prefixed with `/api/v1`):
- `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh` — auth endpoints
- `GET /posts`, `GET /posts/:id`, `GET /users/:userId/posts` — public reads (paginated, tag-filterable)
- `GET /posts/search?q=` — search posts
- `GET /users/:userId` — public user profile
- `POST /posts`, `PUT /posts/:id`, `DELETE /posts/:id` — protected CRUD (Bearer token)
- `POST /upload` — image upload (Bearer token, multipart/form-data)
- `PUT /users/avatar` — avatar upload (Bearer token)
- `GET /posts/:id/comments`, `POST /posts/:id/comments`, `DELETE /posts/:id/comments/:commentId` — comments

Response format: `{ status, data, error }`

## CI/CD

GitHub Actions (`.github/workflows/deploy-frontend.yml`): on push to `main`, runs lint → build → Docker image (linux/arm64) → push to GHCR → deploy via SSH + docker-compose.
