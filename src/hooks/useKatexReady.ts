import { useEffect, useState } from 'react';
import { isKatexReady, subscribeKatexReady } from '../utils/markdownParser';

/**
 * KaTeX 모듈 로딩 완료 시점을 구독한다.
 * 반환값(version)이 바뀌면 호출자는 마크다운을 재렌더해 수식을 올바르게 그릴 수 있다.
 *
 * 사용 예:
 *   const katexVersion = useKatexReady();
 *   const html = useMemo(() => renderMarkdown(content), [content, katexVersion]);
 */
export function useKatexReady(): number {
    const [version, setVersion] = useState<number>(isKatexReady() ? 1 : 0);

    useEffect(() => {
        if (isKatexReady()) return;
        return subscribeKatexReady(() => setVersion((v) => v + 1));
    }, []);

    return version;
}
