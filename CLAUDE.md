# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tolelog is a Korean-language markdown blog platform. This repository contains only the **React frontend**; the backend is a separate Go Fiber API server (not in this repo).

## Development Commands

```bash
npm run dev       # Start dev server (port 5173, proxies /api → localhost:3000, strips /api prefix)
npm run build     # Production build (outputs to ./dist)
npm run lint      # ESLint flat config (no-unused-vars ignores ^[A-Z_] pattern)
npm run preview   # Preview production build locally
```

Environment: Node.js 20, npm. Copy `.env.example` to `.env` and set `VITE_API_URL` (defaults to `http://localhost:3000`).

Vite config includes manual chunk splitting: `highlight.js/lib/common` is extracted into a separate `hljs` chunk.

## Architecture

**Stack:** React 19 + Vite 7 + React Router 7. No TypeScript — all source is JSX/JS.

**State management:** React Context API via `AuthContext`/`AuthProvider` and `ThemeContext`/`ThemeProvider`. Auth tokens, user info, and theme preference persisted in `localStorage` using keys from `src/utils/constants.js`.

**API layer:** `src/utils/api.js` provides several patterns:
- `useApi()` hook — returns a `request()` function that auto-attaches Bearer token and handles 401 logout. Used for authenticated operations within components.
- `POST_API` object — standalone async functions for post CRUD. Uses internal `authenticatedFetch` helper to reduce duplication.
- `IMAGE_API.upload()` — FormData upload with Bearer token for server-side image storage.
- `USER_API.getProfile()` — public user profile fetch.

Auth-specific API calls (`loginUser`, `registerUser`) live in `src/utils/authApi.js`.

**Shared utilities:**
- `src/utils/constants.js` — `API_BASE_URL`, `STORAGE_KEYS` (incl. `THEME`), `AUTO_SAVE_DELAY_MS`, `IMAGE_CONSTRAINTS`
- `src/utils/markdownParser.js` — custom markdown parser with `parseBlocks()`, `renderBlock()`, `renderMarkdown()`, `parseInline()`. Supports headings, lists, tables, code blocks (highlight.js/lib/common), blockquotes, images, checklists, footnotes, and KaTeX math ($inline$, $$block$$).
- `src/utils/markdown.js` — re-exports `renderMarkdown` from markdownParser
- `src/utils/imageUpload.js` — image validation, compression, Base64 conversion
- `src/utils/authApi.js` — `loginUser()`, `registerUser()` fetch wrappers

**Components:**
- `AuthForm` (`src/components/AuthForm.jsx`) — shared form component used by both LoginBox and RegisterBox. Styled via `AuthForm.css`.
- `LoginBox` / `RegisterBox` — thin wrappers around AuthForm with field config, validation, and submit handlers.
- `ImageUploadButton` — image upload with compression and Base64 encoding.
- `BlockEditor` — Typora/Notion-style block-based inline markdown editor with `forwardRef`. Exposes `wrapSelection()` via `useImperativeHandle`. Supports Ctrl+B/I/K/` shortcuts.
- `ThemeToggle` — dark/light mode toggle button.

**Routing:** React Router DOM with `BrowserRouter` in `App.jsx`. Protected routes wrapped with `PrivateRoute` component (redirects to `/login` if no token).

**Key routes:**
| Path | Component | Auth |
|------|-----------|------|
| `/` | HomePage | No |
| `/post/:postId` | PostDetailPage | No |
| `/user/:userId` | UserProfilePage | No |
| `/login`, `/register` | LoginPage, RegisterPage | No |
| `/editor` | EditorPage (new post) | No |
| `/editor/:postId` | EditorPage (edit) | Yes |
| `/editor_private` | EditorPage (private post) | Yes |

**Editor:** Block-based inline markdown editor (Typora/Notion style) via `BlockEditor` component. Uses custom `markdownParser.js` + `highlight.js/lib/common` for rendering. Toolbar with format buttons (Bold, Italic, Heading, Code, Link, Strikethrough) and keyboard shortcuts (Ctrl+B/I/K/`). Images are Base64-encoded (max 5MB, compressed to 1200px width). Drafts auto-saved to `localStorage` via `useAutoSave` hook (1s debounce).

**Theming:** CSS custom properties defined in `src/index.css` (`:root` for light, `[data-theme="dark"]` for dark). Theme toggle in HomePage header. All CSS files use CSS variables (`--bg-primary`, `--text-primary`, `--accent-color`, etc.).

## Backend API (for reference)

The Go Fiber backend exposes:
- `POST /login`, `POST /register` — auth endpoints
- `GET /posts`, `GET /posts/:id`, `GET /users/:userId/posts` — public reads (paginated)
- `POST /posts`, `PUT /posts/:id`, `DELETE /posts/:id` — protected CRUD (Bearer token)

Response format: `{ status, data, error }`

## CI/CD

GitHub Actions (`.github/workflows/ci-cd.yml`): on push to `main`, builds the app then deploys static files to a macOS server via SSH + Nginx.
