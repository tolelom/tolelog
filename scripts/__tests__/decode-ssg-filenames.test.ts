import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { decodeSsgFilenames } from '../decode-ssg-filenames.mjs';

describe('decodeSsgFilenames', () => {
    let dir = '';
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('renames percent-encoded Korean slug pages and loader data so nginx can serve them', () => {
        dir = mkdtempSync(join(tmpdir(), 'ssg-'));
        mkdirSync(join(dir, 'post'));
        mkdirSync(join(dir, 'static-loader-data', 'post'), { recursive: true });
        writeFileSync(join(dir, 'post', '%ED%85%8C%EC%8A%A4%ED%8A%B8-1.html'), '');
        writeFileSync(join(dir, 'post', '30.html'), '');
        writeFileSync(join(dir, 'static-loader-data', 'post', '%ED%85%8C%EC%8A%A4%ED%8A%B8-1.abc.json'), '{}');

        expect(decodeSsgFilenames(dir)).toBe(2);
        expect(readdirSync(join(dir, 'post')).sort()).toEqual(['30.html', '테스트-1.html']);
        expect(readdirSync(join(dir, 'static-loader-data', 'post'))).toEqual(['테스트-1.abc.json']);
    });
});
