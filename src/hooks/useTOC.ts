import { useState, useEffect, useMemo } from 'react';
import { slugifyHeading } from '../utils/markdownParser';

export interface TocItem {
    level: number;
    text: string;
    id: string;
}

function extractToc(content: string): TocItem[] {
    const lines = content.split('\n');
    const toc: TocItem[] = [];
    let inCode = false;
    for (const line of lines) {
        if (line.trimStart().startsWith('```')) { inCode = !inCode; continue; }
        if (inCode) continue;
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
            toc.push({
                level: match[1].length,
                text: match[2].replace(/[*_~`[\]()]/g, '').trim(),
                id: slugifyHeading(match[2]),
            });
        }
    }
    return toc;
}

export function useTOC(content: string | null) {
    const [activeTocId, setActiveTocId] = useState<string | null>(null);
    const [mobileTocOpen, setMobileTocOpen] = useState(false);

    const toc = useMemo<TocItem[]>(() => (content ? extractToc(content) : []), [content]);

    useEffect(() => {
        if (toc.length === 0) return;
        const headingEls = toc.map(item => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
        if (headingEls.length === 0) return;
        const observer = new IntersectionObserver(
            (entries: IntersectionObserverEntry[]) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) setActiveTocId(entry.target.id);
                });
            },
            { rootMargin: '0px 0px -80% 0px', threshold: 0 }
        );
        headingEls.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, [toc]);

    return { toc, activeTocId, mobileTocOpen, setMobileTocOpen };
}
