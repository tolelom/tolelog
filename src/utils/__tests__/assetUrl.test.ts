import { describe, it, expect } from 'vitest';
import { resolveAssetUrl } from '../assetUrl';
import { API_BASE_URL } from '../constants';

// 업로드 파일은 API 서버에 있다. 서버는 /uploads/... 처럼 경로만 주므로 블로그 도메인에서 쓰려면 API 주소를 붙여야 한다.
describe('resolveAssetUrl', () => {
    it('서버가 준 경로에 API 주소를 붙인다', () => {
        expect(resolveAssetUrl('/uploads/images/a.png')).toBe(`${API_BASE_URL}/uploads/images/a.png`);
    });

    it.each(['https://cdn.example.com/a.png', 'http://x/a.png', 'data:image/png;base64,AAA', 'blob:http://localhost/1'])(
        '이미 완성된 주소(%s)는 그대로 둔다', (url) => {
            expect(resolveAssetUrl(url)).toBe(url);
        });

    it('빈 값은 빈 값으로 둔다', () => {
        expect(resolveAssetUrl('')).toBe('');
    });
});
