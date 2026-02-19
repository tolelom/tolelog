# Tolelog

Tolelog 블로그 플랫폼의 React 프론트엔드입니다.
백엔드는 [fiber_api_server](https://github.com/tolelom/fiber_api_server) 레포지토리를 참고하세요.

## Tech Stack

- **Frontend**: React 19 + Vite 7 + React Router 7
- **State Management**: React Context API (Auth, Theme)
- **Markdown Editor**: Typora/Notion 스타일 블록 기반 인라인 마크다운 에디터
- **Styling**: CSS Custom Properties (다크/라이트 테마 지원)
- **Markdown Rendering**: 커스텀 마크다운 파서 + highlight.js + KaTeX
- **Deployment**: GitHub Actions + SSH + Nginx
- **Containerization**: Docker

## Features

- **마크다운 지원**: 헤딩, 리스트, 테이블, 코드블록, 블록인용, 수식(inline, block), 체크리스트, 각주
- **Syntax Highlighting**: highlight.js를 통한 코드 블록 하이라이팅
- **수식 렌더링**: KaTeX를 이용한 수학 수식 렌더링
- **이미지 업로드**: 자동 압축 및 Base64 인코딩 (최대 5MB)
- **테마 지원**: 다크/라이트 모드 토글 및 localStorage 영속화
- **인증**: JWT 기반 로그인/회원가입
- **자동 저장**: 포스트 작성 중 1초 디바운스로 임시 저장
- **CI/CD**: GitHub Actions를 통한 자동 빌드 및 배포
- **작성자 정보**: 포스트 목록에 작성자명 및 작성 날짜 표시

## Getting Started

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# VITE_API_URL 설정 (기본값: http://localhost:3000)

# 개발 서버 실행 (port 5173, /api → localhost:3000 프록시)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 빌드 미리보기
npm run preview

# 린트 검사
npm run lint
```
