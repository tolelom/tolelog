import type { Block } from '../../types';

const FOOTNOTE_DEF_RE = /^\[\^([\w-]+)\]:\s+(.+)$/;
// 수평선은 같은 문자가 3개 이상이어야 한다 (CommonMark). `-*-` 같은 혼용은 문단이다.
const HR_RE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const IMAGE_LINE_RE = /^!\[([^\]]*)\]\(([^)]+)\)(\{width=([^}]+)\})?$/;
const TABLE_DELIMITER_RE = /^\|[\s:-]+\|/;
const CHECKLIST_RE = /^\s*[-*+]\s+\[[ xX]\]\s/;
const CHECKLIST_ITEM_RE = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/;
const UNORDERED_RE = /^\s*[-*+]\s+/;
const ORDERED_RE = /^\s*\d+\.\s+/;

function isTableLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|');
}

// 구분선(| --- |)이 뒤따를 때만 테이블이다. 아니면 그냥 문단 텍스트.
function startsTable(lines: string[], index: number): boolean {
    return isTableLine(lines[index])
        && index + 1 < lines.length
        && isTableLine(lines[index + 1])
        && TABLE_DELIMITER_RE.test(lines[index + 1].trim());
}

// parseBlocks 의 블록 디스패치 조건과 정확히 같아야 한다.
// 어긋나면 문단 fallback 이 한 줄도 소비하지 못해 무한 루프가 된다.
function isBlockStart(lines: string[], index: number): boolean {
    const line = lines[index];
    return line.trim() === ''
        || FOOTNOTE_DEF_RE.test(line)
        || line.trim().startsWith('$$')
        || line.trimStart().startsWith('```')
        || HR_RE.test(line)
        || HEADING_RE.test(line)
        || IMAGE_LINE_RE.test(line.trim())
        || startsTable(lines, index)
        || line.trimStart().startsWith('>')
        || CHECKLIST_RE.test(line)
        || UNORDERED_RE.test(line)
        || ORDERED_RE.test(line);
}

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
        const footnoteDefMatch = line.match(FOOTNOTE_DEF_RE);
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
        if (HR_RE.test(line)) {
            blocks.push({ type: 'hr', raw: line });
            i++;
            continue;
        }

        // 헤더: # ~ ######
        const headingMatch = line.match(HEADING_RE);
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
        const imgMatch = line.trim().match(IMAGE_LINE_RE);
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
        if (startsTable(lines, i)) {
            const tableLines: string[] = [];
            while (i < lines.length && isTableLine(lines[i])) {
                tableLines.push(lines[i]);
                i++;
            }
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
        if (CHECKLIST_RE.test(line)) {
            const checkItems: { checked: boolean; text: string }[] = [];
            while (i < lines.length && CHECKLIST_RE.test(lines[i])) {
                const match = lines[i].match(CHECKLIST_ITEM_RE);
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
        if (UNORDERED_RE.test(line)) {
            const listResult = parseList(lines, i, 'unordered');
            blocks.push(listResult.block);
            i = listResult.nextIndex;
            continue;
        }

        // 순서 있는 리스트: 1. 2. 등
        if (ORDERED_RE.test(line)) {
            const listResult = parseList(lines, i, 'ordered');
            blocks.push(listResult.block);
            i = listResult.nextIndex;
            continue;
        }

        // 문단: 그 외 텍스트 (연속된 비어있지 않은 줄 합침)
        const paraLines: string[] = [];
        while (i < lines.length && !isBlockStart(lines, i)) {
            paraLines.push(lines[i]);
            i++;
        }
        if (paraLines.length === 0) {
            // 도달 불가 — isBlockStart 가 위 디스패치 조건과 어긋났을 때의 안전장치.
            // 무한 루프 대신 해당 줄을 문단으로 소비한다.
            paraLines.push(line);
            i++;
        }
        blocks.push({
            type: 'paragraph',
            text: paraLines.join('\n'),
            raw: paraLines.join('\n'),
        });
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
    const pattern = type === 'ordered' ? ORDERED_RE : UNORDERED_RE;

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
