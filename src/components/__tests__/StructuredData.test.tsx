import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('vite-react-ssg', () => ({
    Head: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ArticleJsonLd, BlogJsonLd, BreadcrumbJsonLd } from '../StructuredData';

function readJsonLd(): Record<string, unknown> {
    // <script type="application/ld+json"> 은 React 19 hoist 대상이 아니므로 document 전체에서 찾는다.
    const script = document.querySelector('script[type="application/ld+json"]');
    if (!script) throw new Error('JSON-LD script not found');
    // <script> 내용에서 `<` 가 `<` 로 이스케이프되어 있으므로 복원 후 파싱
    const raw = (script.textContent ?? '').replace(/\\u003c/g, '<');
    return JSON.parse(raw);
}

beforeEach(() => {
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
});

describe('ArticleJsonLd', () => {
    it('emits a valid BlogPosting JSON-LD with required fields', () => {
        render(
            <ArticleJsonLd
                url="/post/hello-1"
                title="Hello"
                description="첫 글입니다"
                authorName="jane"
                datePublished="2026-05-19T00:00:00Z"
            />,
        );
        const data = readJsonLd();
        expect(data['@context']).toBe('https://schema.org');
        expect(data['@type']).toBe('BlogPosting');
        expect(data.headline).toBe('Hello');
        expect(data.description).toBe('첫 글입니다');
        expect(data.url).toBe('https://blog.tolelom.xyz/post/hello-1');
        expect(data.mainEntityOfPage).toEqual({ '@type': 'WebPage', '@id': 'https://blog.tolelom.xyz/post/hello-1' });
        expect(data.author).toEqual({ '@type': 'Person', name: 'jane' });
        expect(data.publisher).toMatchObject({ '@type': 'Organization', name: 'Tolelog' });
        expect(data.datePublished).toBe('2026-05-19T00:00:00Z');
        // dateModified 미지정 시 datePublished 로 폴백
        expect(data.dateModified).toBe('2026-05-19T00:00:00Z');
    });

    it('includes image and keywords when provided', () => {
        render(
            <ArticleJsonLd
                url="/post/x-2"
                title="X"
                description="d"
                authorName="a"
                datePublished="2026-05-19T00:00:00Z"
                dateModified="2026-05-20T00:00:00Z"
                image="/img.png"
                tags={['react', 'seo']}
            />,
        );
        const data = readJsonLd();
        expect(data.image).toBe('https://blog.tolelom.xyz/img.png');
        expect(data.keywords).toBe('react, seo');
        expect(data.dateModified).toBe('2026-05-20T00:00:00Z');
    });

    it('omits keywords when tags array is empty', () => {
        render(
            <ArticleJsonLd
                url="/post/x-3"
                title="X"
                description="d"
                authorName="a"
                datePublished="2026-05-19T00:00:00Z"
                tags={[]}
            />,
        );
        const data = readJsonLd();
        expect(data.keywords).toBeUndefined();
    });
});

describe('BlogJsonLd', () => {
    it('emits a Blog schema with site defaults', () => {
        render(<BlogJsonLd />);
        const data = readJsonLd();
        expect(data['@type']).toBe('Blog');
        expect(data.name).toBe('Tolelog');
        expect(data.url).toBe('https://blog.tolelom.xyz');
        expect(data.publisher).toMatchObject({ '@type': 'Organization' });
    });

    it('allows overriding description', () => {
        render(<BlogJsonLd description="시리즈 모음" />);
        const data = readJsonLd();
        expect(data.description).toBe('시리즈 모음');
    });
});

describe('BreadcrumbJsonLd', () => {
    it('builds a BreadcrumbList with numbered positions', () => {
        render(
            <BreadcrumbJsonLd
                items={[
                    { name: '홈', url: '/' },
                    { name: 'My Post', url: '/post/my-post-1' },
                ]}
            />,
        );
        const data = readJsonLd();
        expect(data['@type']).toBe('BreadcrumbList');
        const items = data.itemListElement as Array<Record<string, unknown>>;
        expect(items).toHaveLength(2);
        expect(items[0]).toEqual({
            '@type': 'ListItem',
            position: 1,
            name: '홈',
            item: 'https://blog.tolelom.xyz/',
        });
        expect(items[1]).toEqual({
            '@type': 'ListItem',
            position: 2,
            name: 'My Post',
            item: 'https://blog.tolelom.xyz/post/my-post-1',
        });
    });

    it('renders nothing for empty items array', () => {
        render(<BreadcrumbJsonLd items={[]} />);
        expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
    });
});
