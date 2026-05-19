/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 빌드 시 prerender 에서 제외할 비공개/인증 라우트 (보안 + 크롤 예산 절약)
// vite-react-ssg 가 paths 를 leading-slash 없이 전달하므로 ('login' vs '/login') 정규화 후 비교.
const PRIVATE_ROUTES = new Set<string>([
  'login',
  'register',
  'settings',
  'drafts',
  'editor',
  'editor_private',
]);

function normalizePath(p: string): string {
  if (p === '/' || p === '') return '/';
  return p.startsWith('/') ? p.slice(1) : p;
}

// 빌드 시 백엔드 sitemap.xml 을 파싱해서 prerender 할 공개 라우트(/post/:id, /user/:id, /series/:id) 를 발견한다.
// 환경변수 VITE_SSG_API_URL 또는 VITE_API_URL 을 우선 사용, 둘 다 없으면 운영 API 로 폴백.
async function discoverDynamicRoutes(): Promise<string[]> {
  const apiBase =
    process.env.VITE_SSG_API_URL
    || process.env.VITE_API_URL
    || 'https://api.tolelom.xyz';
  const url = `${apiBase.replace(/\/$/, '')}/api/v1/sitemap.xml`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[ssg] sitemap fetch ${res.status} ${url} — 동적 라우트 prerender 생략`);
      return [];
    }
    const xml = await res.text();
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);
    // sitemap 의 URL 은 절대주소(blog.tolelom.xyz/post/123). pathname 만 추출.
    const paths = locs
      .map(loc => {
        try { return new URL(loc).pathname; }
        catch { return loc.startsWith('/') ? loc : null; }
      })
      .filter((p): p is string => !!p && /^\/(post|user|series)\//.test(p));
    console.info(`[ssg] sitemap 에서 ${paths.length} 개 공개 라우트 발견`);
    return paths;
  } catch (err) {
    console.warn(`[ssg] sitemap 접근 실패 — 동적 라우트 prerender 생략:`, err instanceof Error ? err.message : err);
    return [];
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    // manualChunks 는 SSR 빌드와 호환되지 않으므로 (external 모듈 충돌) 제거.
    // 페이지가 React.lazy 로 분리되어 있어 hljs/dompurify/katex 는 자연스럽게 페이지 청크에 포함되고,
    // katex 는 markdownParser 에서 dynamic import 로 별도 청크로 분리된다.
  },
  // SSR/SSG 빌드 시 일부 라이브러리는 번들에 포함시켜야 한다 (Node 환경에서 ESM/CJS 호환 문제 회피)
  ssr: {
    noExternal: ['highlight.js', 'dompurify', 'react-helmet-async'],
  },
  // vite-react-ssg 옵션 — 빌드 시 prerender 동작 제어
  ssgOptions: {
    async includedRoutes(paths) {
      // 1) 정적 라우트에서 비공개 페이지 + 파라메트릭(`:param`) + catch-all(*) 제외
      const staticPublic = paths.filter(p => {
        const norm = normalizePath(p);
        if (norm === '*') return false;
        if (norm.includes(':')) return false;
        if (PRIVATE_ROUTES.has(norm)) return false;
        if (norm.startsWith('editor/') || norm.startsWith('editor')) return false;
        return true;
      });
      // 2) 동적 라우트는 sitemap 에서 받은 것만 추가 (normalize 후 중복 제거)
      const discovered = (await discoverDynamicRoutes()).map(normalizePath);
      const all = new Set<string>([...staticPublic.map(normalizePath), ...discovered]);
      // 루트는 '/' 형태로 유지
      all.delete('');
      all.add('/');
      return Array.from(all);
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      reporter: ['text', 'json-summary', 'lcov'],
    },
  },
})
