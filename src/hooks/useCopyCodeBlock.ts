import { useEffect, RefObject } from 'react';
import { decodeHtmlEntities } from '../utils/format';

export function useCopyCodeBlock(
    containerRef: RefObject<HTMLElement | null>,
    enabled: boolean = true,
) {
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !enabled) return;

        const handleClick = (e: Event) => {
            const btn = (e.target as HTMLElement).closest('.code-copy-btn') as HTMLElement | null;
            if (!btn) return;
            e.stopPropagation();
            const raw = btn.getAttribute('data-code');
            if (!raw) return;
            const code = decodeHtmlEntities(raw);
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = '복사됨!';
                setTimeout(() => { btn.textContent = '복사'; }, 2000);
            }).catch(() => {
                btn.textContent = '복사 실패';
                setTimeout(() => { btn.textContent = '복사'; }, 2000);
            });
        };

        container.addEventListener('click', handleClick);
        return () => container.removeEventListener('click', handleClick);
    }, [containerRef, enabled]);
}
