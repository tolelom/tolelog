# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tolelog is a Korean-language markdown blog platform. This repository contains only the **React frontend**; the backend is a separate Go Fiber API server (not in this repo).

## Development Commands

```bash
npm run dev       # Start dev server (port 5173, proxies /api to localhost:3000)
npm run build     # Production build (outputs to ./dist)
npm run lint      # ESLint check
npm run preview   # Preview production build locally
```

Environment: Node.js 20, npm. Copy `.env.example` to `.env` and set `VITE_API_URL` (defaults to `http://localhost:3000`).

## Architecture

**Stack:** React 19 + Vite 7 + React Router 7. No TypeScript — all source is JSX/JS.

**State management:** React Context API via `AuthContext`/`AuthProvider`. Auth tokens and user info persisted in `localStorage` using keys from `src/utils/constants.js`.

**API layer:** `src/utils/api.js` provides two patterns:
- `useApi()` hook — returns a `request()` function that auto-attaches Bearer token and handles 401 logout. Used for authenticated operations within components.
- `POST_API` object — standalone async functions for post CRUD. Uses internal `authenticatedFetch` helper to reduce duplication.

Auth-specific API calls (`loginUser`, `registerUser`) live in `src/utils/authApi.js`.

**Shared utilities:**
- `src/utils/constants.js` — `API_BASE_URL`, `STORAGE_KEYS`, `AUTO_SAVE_DELAY_MS`, `IMAGE_CONSTRAINTS`
- `src/utils/markdown.js` — `configureMarked()` and `renderMarkdown()` (shared between EditorPage and PostDetailPage)
- `src/utils/imageUpload.js` — image validation, compression, Base64 conversion
- `src/utils/authApi.js` — `loginUser()`, `registerUser()` fetch wrappers

**Components:**
- `AuthForm` (`src/components/AuthForm.jsx`) — shared form component used by both LoginBox and RegisterBox. Styled via `AuthForm.css`.
- `LoginBox` / `RegisterBox` — thin wrappers around AuthForm with field config, validation, and submit handlers.
- `ImageUploadButton` — image upload with compression and Base64 encoding.

**Routing:** React Router DOM with `BrowserRouter` in `App.jsx`. Protected routes wrapped with `PrivateRoute` component (redirects to `/login` if no token).

**Key routes:**
| Path | Component | Auth |
|------|-----------|------|
| `/` | HomePage | No |
| `/post/:postId` | PostDetailPage | No |
| `/login`, `/register` | LoginPage, RegisterPage | No |
| `/editor` | EditorPage (new post) | No |
| `/editor/:postId` | EditorPage (edit) | Yes |
| `/editor_private` | EditorPage (private post) | Yes |

**Editor:** Split-pane markdown editor with live preview. Uses `marked` + `highlight.js` for rendering. Images are Base64-encoded (max 5MB, compressed to 1200px width). Drafts auto-saved to `localStorage` via `useAutoSave` hook (1s debounce).

## Backend API (for reference)

The Go Fiber backend exposes:
- `POST /login`, `POST /register` — auth endpoints
- `GET /posts`, `GET /posts/:id`, `GET /users/:userId/posts` — public reads (paginated)
- `POST /posts`, `PUT /posts/:id`, `DELETE /posts/:id` — protected CRUD (Bearer token)

Response format: `{ status, data, error }`

## CI/CD

GitHub Actions (`.github/workflows/ci-cd.yml`): on push to `main`, builds the app then deploys static files to a macOS server via SSH + Nginx.
