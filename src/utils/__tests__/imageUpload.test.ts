import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api', () => ({
    IMAGE_API: {
        upload: vi.fn(),
    },
}));

import { validateImageFile, createMarkdownImage, uploadImageToServer } from '../imageUpload';
import { IMAGE_API } from '../api';

function makeFile(name: string, size: number, type: string): File {
    // jsdom 의 File 은 byteLength 만큼만 메모리를 잡으므로 0 으로 채워 큰 size 만 갖는 객체를 만들 수 없다.
    // Object.defineProperty 로 size 를 강제 설정.
    const file = new File([new Uint8Array(0)], name, { type });
    Object.defineProperty(file, 'size', { value: size, writable: false });
    return file;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('validateImageFile', () => {
    it('accepts supported MIME types under the size limit', () => {
        const types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        for (const type of types) {
            const file = makeFile(`x.${type.split('/')[1]}`, 1024, type);
            const result = validateImageFile(file);
            expect(result.valid, `${type} should be valid`).toBe(true);
        }
    });

    it('rejects unsupported MIME types', () => {
        const file = makeFile('doc.pdf', 1024, 'application/pdf');
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('JPG');
    });

    it('rejects an empty MIME type (some browsers leave it blank)', () => {
        const file = makeFile('mystery.bin', 1024, '');
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
    });

    it('rejects files over 5MB', () => {
        const file = makeFile('big.jpg', 5 * 1024 * 1024 + 1, 'image/jpeg');
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('5MB');
    });

    it('accepts a file exactly at the size limit', () => {
        const file = makeFile('edge.jpg', 5 * 1024 * 1024, 'image/jpeg');
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
    });
});

describe('createMarkdownImage', () => {
    it('produces standard markdown image syntax', () => {
        expect(createMarkdownImage('/a.png', 'alt')).toBe('![alt](/a.png)');
    });

    it('uses default alt when none provided', () => {
        expect(createMarkdownImage('/a.png')).toBe('![이미지](/a.png)');
    });

    it('preserves URL as-is (caller responsible for encoding)', () => {
        expect(createMarkdownImage('https://example.com/path with spaces.png', 'x')).toBe('![x](https://example.com/path with spaces.png)');
    });
});

describe('uploadImageToServer', () => {
    it('returns the URL on success', async () => {
        (IMAGE_API.upload as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            status: 'success',
            data: { url: '/uploads/img-1.png' },
        });
        const file = makeFile('x.png', 100, 'image/png');
        const url = await uploadImageToServer(file, 'token-abc');
        expect(url).toBe('/uploads/img-1.png');
        expect(IMAGE_API.upload).toHaveBeenCalledWith(file, 'token-abc');
    });

    it('throws when the API reports failure', async () => {
        (IMAGE_API.upload as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ status: 'error', error: 'oh no' });
        const file = makeFile('x.png', 100, 'image/png');
        await expect(uploadImageToServer(file, 'token')).rejects.toThrow('이미지 업로드에 실패했습니다');
    });

    it('propagates underlying network errors', async () => {
        (IMAGE_API.upload as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'));
        const file = makeFile('x.png', 100, 'image/png');
        await expect(uploadImageToServer(file, 'token')).rejects.toThrow('network');
    });
});
