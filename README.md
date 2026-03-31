# Tolelog

블로그 플랫폼의 React 프론트엔드.
백엔드는 [fiber_api_server](https://github.com/tolelom/fiber_api_server) 참고.

## Tech Stack

- **Frontend**: React 19 + Vite 7 + React Router 7 + TypeScript 5.8
- **State Management**: React Context API (Auth, Theme)
- **Editor**: Typora/Notion 스타일 블록 기반 마크다운 에디터
- **Styling**: CSS Custom Properties (다크/라이트 테마)
- **Markdown**: 커스텀 파서 + highlight.js + KaTeX + DOMPurify
- **Test**: Vitest + 커버리지 리포트
- **Deploy**: GitHub Actions → Docker (Nginx Alpine) → GHCR → SSH 배포

## Features

### 에디터 / 마크다운
- 블록 기반 인라인 마크다운 에디터
- 헤딩, 리스트, 테이블, 코드블록, 블록인용, 체크리스트, 각주
- highlight.js 코드 하이라이팅
- KaTeX 수식 렌더링 (inline, block)
- 이미지 업로드 (자동 압축, Canvas 기반, 최대 5MB)
- 자동 저장 (1초 디바운스)
- 임시저장/드래프트 관리

### 소셜
- 댓글
- 좋아요
- 태그 자동완성
- 시리즈 (연재 묶기, 시리즈 내 네비게이션)

### 사용자
- JWT 인증 (로그인/회원가입/토큰 갱신)
- 사용자 프로필 / 아바타
- 설정 페이지
- 다크/라이트 테마 토글

### 인프라
- GitHub Actions CI/CD (lint → test → build → deploy)
- PR 커버리지 코멘트 자동 작성
- Docker + Nginx (Gzip, 보안 헤더, 캐싱, SPA 라우팅)
- API 캐싱 레이어

## Getting Started

```bash
npm install

cp .env.example .env
# VITE_API_URL 설정 (기본값: http://localhost:3000)

npm run dev       # 개발 서버 (port 5173)
npm run build     # 프로덕션 빌드
npm run lint      # 린트
npm run test      # 테스트
```
