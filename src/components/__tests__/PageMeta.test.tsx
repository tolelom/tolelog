import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// vite-react-ssg 의 Head 는 children 을 그대로 렌더. React 19 가 metadata 태그를
// <head> 로 자동 호이스팅하므로 검증 시 document.head 를 조회한다.
vi.mock('vite-react-ssg', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import PageMeta from '../PageMeta';

function renderWithRouter(ui: React.ReactNode, route = '/') {
    return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

beforeEach(() => {
    // 이전 테스트가 head 에 남긴 태그 정리
    document.head.querySelectorAll('title,meta,link').forEach((el) => el.remove());
});

describe('PageMeta', () => {
    it('renders the site name only when no title is provided', () => {
        renderWithRouter(<PageMeta />);
        expect(document.head.querySelector('title')?.textContent).toBe('Tolelog');
    });

    it('composes title as "{page} | {site}" when title is given', () => {
        renderWithRouter(<PageMeta title="첫 글" />);
        expect(document.head.querySelector('title')?.textContent).toBe('첫 글 | Tolelog');
    });

    it('uses location.pathname for canonical when not overridden', () => {
        renderWithRouter(<PageMeta />, '/post/hello-1');
        const link = document.head.querySelector('link[rel="canonical"]');
        expect(link?.getAttribute('href')).toBe('https://blog.tolelom.xyz/post/hello-1');
    });

    it('honors a custom canonical path', () => {
        renderWithRouter(<PageMeta canonical="/" />, '/post/1');
        expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://blog.tolelom.xyz/');
    });

    it('emits robots noindex,nofollow when noindex prop is true', () => {
        renderWithRouter(<PageMeta noindex />);
        expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow');
    });

    it('does not render robots when noindex is false', () => {
        renderWithRouter(<PageMeta />);
        expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    });

    it('emits article-specific OG tags when ogType="article"', () => {
        renderWithRouter(
            <PageMeta
                title="글"
                ogType="article"
                article={{
                    publishedTime: '2026-05-19T00:00:00Z',
                    modifiedTime: '2026-05-20T00:00:00Z',
                    author: 'jane',
                    tags: ['react', 'seo'],
                }}
            />,
        );
        expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('article');
        expect(document.head.querySelector('meta[property="article:published_time"]')?.getAttribute('content')).toBe('2026-05-19T00:00:00Z');
        expect(document.head.querySelector('meta[property="article:modified_time"]')?.getAttribute('content')).toBe('2026-05-20T00:00:00Z');
        expect(document.head.querySelector('meta[property="article:author"]')?.getAttribute('content')).toBe('jane');
        const tags = Array.from(document.head.querySelectorAll('meta[property="article:tag"]')).map(
            (t) => (t as HTMLMetaElement).content,
        );
        expect(tags).toEqual(['react', 'seo']);
    });

    it('promotes twitter:card to summary_large_image when ogImage is provided', () => {
        renderWithRouter(<PageMeta ogImage="/img.png" />);
        expect(document.head.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
        expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://blog.tolelom.xyz/img.png');
    });

    it('keeps absolute ogImage URLs untouched', () => {
        renderWithRouter(<PageMeta ogImage="https://cdn.example.com/x.png" />);
        expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://cdn.example.com/x.png');
    });
});
