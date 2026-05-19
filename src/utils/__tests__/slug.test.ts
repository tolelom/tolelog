import { describe, it, expect } from 'vitest';
import { slugify, postPath, parsePostSlugId } from '../slug';

describe('slugify', () => {
    it('returns empty for empty/whitespace input', () => {
        expect(slugify('')).toBe('');
        expect(slugify('   ')).toBe('');
    });

    it('lowercases ASCII letters and joins with hyphen', () => {
        expect(slugify('Hello World')).toBe('hello-world');
        expect(slugify('Hello WORLD foo')).toBe('hello-world-foo');
    });

    it('preserves Korean characters', () => {
        expect(slugify('리액트 마크다운 블로그')).toBe('리액트-마크다운-블로그');
        expect(slugify('React로 만든 블로그')).toBe('react로-만든-블로그');
    });

    it('preserves digits and removes punctuation', () => {
        expect(slugify('Version 2.0 release')).toBe('version-20-release');
        expect(slugify('What?! Why??')).toBe('what-why');
    });

    it('removes emoji and other symbols', () => {
        expect(slugify('안녕 👋 세상')).toBe('안녕-세상');
        expect(slugify('!@#$%^&*()')).toBe('');
    });

    it('collapses underscores and multiple spaces into single hyphen', () => {
        expect(slugify('foo_bar_baz')).toBe('foo-bar-baz');
        expect(slugify('foo   bar    baz')).toBe('foo-bar-baz');
    });

    it('trims leading and trailing hyphens', () => {
        expect(slugify('  -hello-  ')).toBe('hello');
    });

    it('truncates to 60 runes', () => {
        const long = '가'.repeat(80);
        const result = slugify(long);
        expect(Array.from(result).length).toBeLessThanOrEqual(60);
    });
});

describe('postPath', () => {
    it('produces /post/{slug}-{id} for normal titles', () => {
        expect(postPath({ id: 123, title: 'Hello World' })).toBe('/post/hello-world-123');
        expect(postPath({ id: 1, title: '리액트 블로그' })).toBe('/post/리액트-블로그-1');
    });

    it('falls back to /post/{id} when slug is empty', () => {
        expect(postPath({ id: 42, title: '!@#$%' })).toBe('/post/42');
        expect(postPath({ id: 7, title: '' })).toBe('/post/7');
    });
});

describe('parsePostSlugId', () => {
    it('parses numeric-only id', () => {
        expect(parsePostSlugId('123')).toEqual({ id: 123 });
    });

    it('parses slug + id', () => {
        expect(parsePostSlugId('hello-world-123')).toEqual({ id: 123, slug: 'hello-world' });
        expect(parsePostSlugId('리액트-블로그-1')).toEqual({ id: 1, slug: '리액트-블로그' });
    });

    it('returns null for malformed input', () => {
        expect(parsePostSlugId('')).toBeNull();
        expect(parsePostSlugId(undefined)).toBeNull();
        expect(parsePostSlugId('no-trailing-id')).toBeNull();
        expect(parsePostSlugId('-5')).toBeNull(); // 슬러그 없이 leading hyphen 만 있는 경우는 malformed
        expect(parsePostSlugId('abc-0')).toBeNull(); // id 0 is invalid
    });
});
