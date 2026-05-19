import { ViteReactSSG } from 'vite-react-ssg';
import './index.css';
import { routes } from './App';
import { initErrorReporting } from './utils/errorReporting';

// vite-react-ssg 가 routes 트리를 빌드 시 prerender 하고, 클라이언트에서 hydrate 한다.
// Provider 와 레이아웃 요소는 routes[0].element = <Layout/> 안에서 감싼다.
// KaTeX 는 수식 콘텐츠를 처음 렌더링할 때만 로드된다 (markdownParser.ts).

// 클라이언트 환경에서만 Sentry 초기화 시도 (DSN 없으면 폴백)
if (typeof window !== 'undefined') {
    initErrorReporting();
}

export const createRoot = ViteReactSSG({ routes });
