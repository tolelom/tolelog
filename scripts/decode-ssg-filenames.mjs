import { readdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// vite-react-ssg 는 sitemap 의 퍼센트 인코딩 경로를 그대로 파일 이름으로 쓴다.
// nginx 는 요청 경로를 디코딩해 파일을 찾으므로, 한글 slug 파일은 디코딩된 이름이어야 서빙된다.
export function decodeSsgFilenames(dir) {
    let renamed = 0;
    for (const name of readdirSync(dir)) {
        let path = join(dir, name);
        const decoded = name.includes('%') ? decodeURIComponent(name) : name;
        if (decoded !== name) {
            const target = join(dir, decoded);
            renameSync(path, target);
            path = target;
            renamed += 1;
        }
        if (statSync(path).isDirectory()) {
            renamed += decodeSsgFilenames(path);
        }
    }
    return renamed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const dir = process.argv[2] ?? 'dist';
    console.info(`[ssg] 인코딩된 파일 이름 ${decodeSsgFilenames(dir)} 개를 디코딩했다 (${dir})`);
}
