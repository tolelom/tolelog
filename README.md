# Tolelog

한국어 마크다운 블로그 플랫폼의 React 프론트엔드입니다.
백엔드는 [fiber_api_server](https://github.com/tolelom/fiber_api_server) 레포지토리를 참고하세요.

## Tech Stack

- **Frontend**: React 19 + Vite 7 + React Router 7
- **Editor**: Typora/Notion 스타일 블록 기반 인라인 마크다운 에디터
- **Styling**: CSS Custom Properties (다크/라이트 테마 지원)
- **Deploy**: GitHub Actions + Nginx (macOS 서버)
- **Containerize**: Docker

## Features

- 커스텀 마크다운 파서 (헤딩, 리스트, 테이블, 코드블록, 수식, 각주 등 지원)
- Syntax Highlighting (highlight.js)
- KaTeX 수식 렌더링
- 이미지 업로드 (압축 + Base64, 최대 5MB)
- 다크/라이트 테마 토글
- JWT 기반 인증 (로그인/회원가입)
- 임시저장 자동 저장 (1초 디바운스)
- CI/CD 자동 배포 (GitHub Actions)

## Getting Started

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 에서 VITE_API_URL 설정 (기본값: http://localhost:3000)

# 개발 서버 실행 (port 5173)
npm run dev

# 프로덕션 빌드
npm run build
```

## Project Structure

```
src/
├── components/     # 재사용 컴포넌트 (BlockEditor, AuthForm, ThemeToggle ...)
├── pages/          # 라우트 페이지 (HomePage, PostDetailPage, EditorPage ...)
└── utils/          # API 클라이언트, 마크다운 파서, 상수 등
```

## Routes

| Path | Description | Auth |
|------|-------------|------|
| `/` | 홈 (포스트 목록) | No |
| `/post/:postId` | 포스트 상세 | No |
| `/user/:userId` | 유저 프로필 | No |
| `/login`, `/register` | 인증 | No |
| `/editor` | 새 포스트 작성 | No |
| `/editor/:postId` | 포스트 수정 | Yes |
