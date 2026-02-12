import hljs from 'highlight.js';

// ─── 인라인 파싱 ───

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function parseInline(text) {
    if (!text) return '';

    let result = '';
    let i = 0;

    while (i < text.length) {
        // 이미지: ![alt](url)
        if (text[i] === '!' && text[i + 1] === '[') {
            const altEnd = text.indexOf(']', i + 2);
            if (altEnd !== -1 && text[altEnd + 1] === '(') {
                const urlEnd = text.indexOf(')', altEnd + 2);
                if (urlEnd !== -1) {
                    const alt = text.slice(i + 2, altEnd);
                    const url = text.slice(altEnd + 2, urlEnd);
                    result += `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="max-width: 100%; height: auto;" />`;
                    i = urlEnd + 1;
                    continue;
                }
            }
        }

        // 링크: [text](url)
        if (text[i] === '[') {
            const labelEnd = text.indexOf(']', i + 1);
            if (labelEnd !== -1 && text[labelEnd + 1] === '(') {
                const urlEnd = text.indexOf(')', labelEnd + 2);
                if (urlEnd !== -1) {
                    const label = text.slice(i + 1, labelEnd);
                    const url = text.slice(labelEnd + 2, urlEnd);
                    result += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${parseInline(label)}</a>`;
                    i = urlEnd + 1;
                    continue;
                }
            }
        }

        // 인라인 코드: `code`
        if (text[i] === '`') {
            const end = text.indexOf('`', i + 1);
            if (end !== -1) {
                const code = escapeHtml(text.slice(i + 1, end));
                result += `<code class="inline-code">${code}</code>`;
                i = end + 1;
                continue;
            }
        }

        // 볼드: **text**
        if (text[i] === '*' && text[i + 1] === '*') {
            const end = text.indexOf('**', i + 2);
            if (end !== -1) {
                const inner = parseInline(text.slice(i + 2, end));
                result += `<strong>${inner}</strong>`;
                i = end + 2;
                continue;
            }
        }

        // 이탤릭: *text*
        if (text[i] === '*' && text[i + 1] !== '*') {
            const end = text.indexOf('*', i + 1);
            if (end !== -1 && end > i + 1) {
                const inner = parseInline(text.slice(i + 1, end));
                result += `<em>${inner}</em>`;
                i = end + 1;
                continue;
            }
        }

        // 취소선: ~~text~~
        if (text[i] === '~' && text[i + 1] === '~') {
            const end = text.indexOf('~~', i + 2);
            if (end !== -1) {
                const inner = parseInline(text.slice(i + 2, end));
                result += `<del>${inner}</del>`;
                i = end + 2;
                continue;
            }
        }

        // 줄바꿈
        if (text[i] === '\n') {
            result += '<br>';
            i++;
            continue;
        }

        result += escapeHtml(text[i]);
        i++;
    }

    return result;
}

// ─── 블록 파싱 ───

export function parseBlocks(text) {
    if (!text) return [];

    const lines = text.split('\n');
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // 빈 줄 건너뛰기
        if (line.trim() === '') {
            i++;
            continue;
        }

        // 코드 블록: ```
        if (line.trimStart().startsWith('```')) {
            const indent = line.length - line.trimStart().length;
            const langMatch = line.trimStart().slice(3).trim();
            const lang = langMatch || '';
            const codeLines = [];
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

        // 이미지 단독 라인: ![alt](src)
        const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch) {
            blocks.push({
                type: 'image',
                alt: imgMatch[1],
                src: imgMatch[2],
                raw: line,
            });
            i++;
            continue;
        }

        // 테이블: | ... |
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            const tableLines = [];
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
            const quoteLines = [];
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
        const paraLines = [];
        while (i < lines.length && lines[i].trim() !== '' &&
            !lines[i].trimStart().startsWith('#') &&
            !lines[i].trimStart().startsWith('```') &&
            !lines[i].trimStart().startsWith('>') &&
            !lines[i].trimStart().startsWith('|') &&
            !/^\s*[-*+]\s+/.test(lines[i]) &&
            !/^\s*\d+\.\s+/.test(lines[i]) &&
            !/^(\s*[-*_]\s*){3,}$/.test(lines[i]) &&
            !lines[i].trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)) {
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

function parseTableRow(line) {
    return line.trim().slice(1, -1).split('|').map(cell => cell.trim());
}

function parseTableAlignments(line) {
    return line.trim().slice(1, -1).split('|').map(cell => {
        const trimmed = cell.trim();
        if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
        if (trimmed.endsWith(':')) return 'right';
        return 'left';
    });
}

function parseList(lines, startIndex, type) {
    const items = [];
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
        block: { type: type === 'ordered' ? 'ordered_list' : 'unordered_list', items, raw },
        nextIndex: i,
    };
}

// ─── 렌더링 ───

export function renderBlock(block) {
    switch (block.type) {
        case 'heading':
            return `<h${block.level} class="markdown-heading">${parseInline(block.text)}</h${block.level}>`;

        case 'paragraph':
            return `<p class="markdown-paragraph">${parseInline(block.text)}</p>`;

        case 'code': {
            const lang = block.lang && hljs.getLanguage(block.lang) ? block.lang : 'plaintext';
            const highlighted = hljs.highlight(block.code, { language: lang, ignoreIllegals: true }).value;
            return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
        }

        case 'blockquote':
            return `<blockquote class="markdown-blockquote">${renderMarkdown(block.text)}</blockquote>`;

        case 'unordered_list':
            return `<ul class="markdown-list">${block.items.map(item => `<li>${parseInline(item)}</li>`).join('')}</ul>`;

        case 'ordered_list':
            return `<ol class="markdown-list">${block.items.map(item => `<li>${parseInline(item)}</li>`).join('')}</ol>`;

        case 'table': {
            const headerHtml = block.headers.map((h, idx) => {
                const align = block.alignments[idx] || 'left';
                return `<th style="text-align:${align}">${parseInline(h)}</th>`;
            }).join('');
            const bodyHtml = block.rows.map(row =>
                '<tr>' + row.map((cell, idx) => {
                    const align = block.alignments[idx] || 'left';
                    return `<td style="text-align:${align}">${parseInline(cell)}</td>`;
                }).join('') + '</tr>'
            ).join('');
            return `<table class="markdown-table"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
        }

        case 'hr':
            return '<hr>';

        case 'image':
            return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" style="max-width: 100%; height: auto;" />`;

        default:
            return `<p>${parseInline(block.raw || '')}</p>`;
    }
}

export function renderMarkdown(text) {
    if (!text) return '';
    try {
        const blocks = parseBlocks(text);
        return blocks.map(renderBlock).join('\n');
    } catch (err) {
        console.error('Markdown rendering error:', err);
        return '<p class="error-preview">마크다운 렌더링 오류</p>';
    }
}
