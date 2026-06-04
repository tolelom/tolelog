import type { Block } from '../../types';

export function parseBlocks(text: string): Block[] {
    if (!text) return [];

    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const blocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // 빈 줄 건너뛰기
        if (line.trim() === '') {
            i++;
            continue;
        }

        // 각주 정의: [^id]: text (블록으로 수집)
        const footnoteDefMatch = line.match(/^\[\^([\w-]+)\]:\s+(.+)$/);
        if (footnoteDefMatch) {
            const id = footnoteDefMatch[1];
            const fnText = footnoteDefMatch[2];
            blocks.push({
                type: 'footnote_def',
                id,
                text: fnText,
                raw: line,
            });
            i++;
            continue;
        }

        // 수식 블록: $$...$$
        if (line.trim().startsWith('$$')) {
            if (line.trim().endsWith('$$') && line.trim().length > 4) {
                // 한 줄짜리 블록 수식
                const expr = line.trim().slice(2, -2).trim();
                blocks.push({ type: 'math_block', expr, raw: line });
                i++;
                continue;
            }
            const mathLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('$$')) {
                mathLines.push(lines[i]);
                i++;
            }
            const raw = '$$\n' + mathLines.join('\n') + '\n$$';
            blocks.push({ type: 'math_block', expr: mathLines.join('\n'), raw });
            i++; // 닫는 $$ 건너뛰기
            continue;
        }

        // 코드 블록: ```
        if (line.trimStart().startsWith('```')) {
            const indent = line.length - line.trimStart().length;
            const langMatch = line.trimStart().slice(3).trim();
            const lang = langMatch || '';
            const codeLines: string[] = [];
            i++;
            while (i < lines.length) {
                if (lines[i].trimStart().startsWith('```') && (lines[i].trim().length - lines[i].trimStart().length <= indent || lines[i].trim() === '```')) {
                    break;
                }
                codeLines.push(lines[i]);
                i++;
            }
            const raw = '```' + langMatch + '\n' + codeLines.join('\n') + '\n```';
            blocks.push({ type: 'code', lang, code: codeLines.join('\n'), raw });
            i++; // 닫는 ``` 건너뛰기
            continue;
        }

        // 수평선: ---, ***, ___
        if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
            blocks.push({ type: 'hr', raw: line });
            i++;
            continue;
        }

        // 헤더: # ~ ######
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            blocks.push({
                type: 'heading',
                level: headingMatch[1].length,
                text: headingMatch[2],
                raw: line,
            });
            i++;
            continue;
        }

        // 이미지 단독 라인: ![alt](src) 또는 ![alt](src){width=50%}
        const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)(\{width=([^}]+)\})?$/);
        if (imgMatch) {
            blocks.push({
                type: 'image',
                alt: imgMatch[1],
                src: imgMatch[2],
                width: imgMatch[4] || null,
                raw: line,
            });
            i++;
            continue;
        }

        // 테이블: | ... |
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            // 최소 2줄 (헤더 + 구분선)이어야 테이블
            if (tableLines.length >= 2 && /^\|[\s:-]+\|/.test(tableLines[1].trim())) {
                const headerCells = parseTableRow(tableLines[0]);
                const alignments = parseTableAlignments(tableLines[1]);
                const bodyRows = tableLines.slice(2).map(parseTableRow);
                blocks.push({
                    type: 'table',
                    headers: headerCells,
                    alignments,
                    rows: bodyRows,
                    raw: tableLines.join('\n'),
                });
            } else {
                // 테이블이 아니면 문단으로
                blocks.push({ type: 'paragraph', text: tableLines.join('\n'), raw: tableLines.join('\n') });
            }
            continue;
        }

        // 인용문: >
        if (line.trimStart().startsWith('>')) {
            const quoteLines: string[] = [];
            while (i < lines.length && (lines[i].trimStart().startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0 && !lines[i].trimStart().startsWith('#')))) {
                if (!lines[i].trimStart().startsWith('>') && lines[i].trim() === '') break;
                quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
                i++;
            }
            blocks.push({
                type: 'blockquote',
                text: quoteLines.join('\n'),
                raw: quoteLines.map(l => '> ' + l).join('\n'),
            });
            continue;
        }

        // 체크리스트: - [ ] 또는 - [x]
        if (/^\s*[-*+]\s+\[[ xX]\]\s/.test(line)) {
            const checkItems: { checked: boolean; text: string }[] = [];
            while (i < lines.length && /^\s*[-*+]\s+\[[ xX]\]\s/.test(lines[i])) {
                const match = lines[i].match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
                if (match) {
                    checkItems.push({
                        checked: match[1].toLowerCase() === 'x',
                        text: match[2],
                    });
                }
                i++;
            }
            const raw = checkItems.map(item =>
                `- [${item.checked ? 'x' : ' '}] ${item.text}`
            ).join('\n');
            blocks.push({ type: 'checklist', items: checkItems, raw });
            continue;
        }

        // 순서 없는 리스트: - 또는 * 또는 +
        if (/^\s*[-*+]\s+/.test(line)) {
            const listResult = parseList(lines, i, 'unordered');
            blocks.push(listResult.block);
            i = listResult.nextIndex;
            continue;
        }

        // 순서 있는 리스트: 1. 2. 등
        if (/^\s*\d+\.\s+/.test(line)) {
            const listResult = parseList(lines, i, 'ordered');
            blocks.push(listResult.block);
            i = listResult.nextIndex;
            continue;
        }

        // 문단: 그 외 텍스트 (연속된 비어있지 않은 줄 합침)
        const paraLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== '' &&
            !lines[i].trimStart().startsWith('#') &&
            !lines[i].trimStart().startsWith('```') &&
            !lines[i].trimStart().startsWith('$$') &&
            !lines[i].trimStart().startsWith('>') &&
            !lines[i].trimStart().startsWith('|') &&
            !/^\s*[-*+]\s+/.test(lines[i]) &&
            !/^\s*\d+\.\s+/.test(lines[i]) &&
            !/^(\s*[-*_]\s*){3,}$/.test(lines[i]) &&
            !lines[i].trim().match(/^!\[([^\]]*)\]\(([^)]+)\)(\{width=[^}]+\})?$/) &&
            !lines[i].match(/^\[\^[\w-]+\]:\s+/)) {
            paraLines.push(lines[i]);
            i++;
        }
        if (paraLines.length > 0) {
            blocks.push({
                type: 'paragraph',
                text: paraLines.join('\n'),
                raw: paraLines.join('\n'),
            });
        }
    }

    return blocks;
}

function parseTableRow(line: string): string[] {
    return line.trim().slice(1, -1).split('|').map(cell => cell.trim());
}

function parseTableAlignments(line: string): string[] {
    return line.trim().slice(1, -1).split('|').map(cell => {
        const trimmed = cell.trim();
        if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
        if (trimmed.endsWith(':')) return 'right';
        return 'left';
    });
}

interface ListParseResult {
    block: Block;
    nextIndex: number;
}

function parseList(lines: string[], startIndex: number, type: 'ordered' | 'unordered'): ListParseResult {
    const items: string[] = [];
    let i = startIndex;
    const pattern = type === 'ordered' ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;

    while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === '') {
            // 빈 줄 다음에 리스트가 이어지면 계속, 아니면 종료
            if (i + 1 < lines.length && pattern.test(lines[i + 1])) {
                i++;
                continue;
            }
            break;
        }
        if (pattern.test(line)) {
            const content = line.replace(pattern, '');
            items.push(content);
            i++;
        } else if (line.startsWith('  ') || line.startsWith('\t')) {
            // 들여쓰기된 연속 줄 → 이전 아이템에 합침
            if (items.length > 0) {
                items[items.length - 1] += '\n' + line.trim();
            }
            i++;
        } else {
            break;
        }
    }

    const raw = lines.slice(startIndex, i).join('\n');
    return {
        block: { type: type === 'ordered' ? 'ordered_list' : 'unordered_list', items, raw } as Block,
        nextIndex: i,
    };
}
