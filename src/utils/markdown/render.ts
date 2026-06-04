import hljs from 'highlight.js/lib/common';
import DOMPurify from 'dompurify';
import type { Block, FootnoteDefBlock } from '../../types';
import { escapeHtml, slugifyHeading } from './text';
import { parseInlineWithRefs } from './inline';
import { parseBlocks } from './blocks';
import { renderKatex } from './katex';

function renderBlockWithRefs(block: Block, refs: Set<string>): string {
    const inline = (text: string) => parseInlineWithRefs(text, refs);

    switch (block.type) {
        case 'heading': {
            const headingId = slugifyHeading(block.text);
            return `<h${block.level} id="${headingId}" class="markdown-heading">${inline(block.text)}</h${block.level}>`;
        }

        case 'paragraph':
            return `<p class="markdown-paragraph">${inline(block.text)}</p>`;

        case 'code': {
            const lang = block.lang && hljs.getLanguage(block.lang) ? block.lang : 'plaintext';
            const highlighted = hljs.highlight(block.code, { language: lang, ignoreIllegals: true }).value;
            const escapedCode = escapeHtml(block.code).replace(/'/g, '&#39;');
            if (block.lang) {
                return `<div class="code-block-wrapper has-lang"><span class="code-lang-label">${escapeHtml(block.lang)}</span><button class="code-copy-btn" data-code="${escapedCode}">복사</button><pre><code class="hljs language-${lang}">${highlighted}</code></pre></div>`;
            }
            return `<div class="code-block-wrapper"><button class="code-copy-btn" data-code="${escapedCode}">복사</button><pre><code class="hljs language-${lang}">${highlighted}</code></pre></div>`;
        }

        case 'math_block':
            return `<div class="math-block">${renderKatex(block.expr, true)}</div>`;

        case 'blockquote':
            return `<blockquote class="markdown-blockquote">${renderMarkdownWithRefs(block.text, refs)}</blockquote>`;

        case 'checklist':
            return `<ul class="markdown-checklist">${block.items.map(item =>
                `<li class="checklist-item"><input type="checkbox" ${item.checked ? 'checked' : ''} disabled /><span>${inline(item.text)}</span></li>`
            ).join('')}</ul>`;

        case 'unordered_list':
            return `<ul class="markdown-list">${block.items.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`;

        case 'ordered_list':
            return `<ol class="markdown-list">${block.items.map(item => `<li>${inline(item)}</li>`).join('')}</ol>`;

        case 'table': {
            const headerHtml = block.headers.map((h, idx) => {
                const align = block.alignments[idx] || 'left';
                return `<th style="text-align:${align}">${inline(h)}</th>`;
            }).join('');
            const bodyHtml = block.rows.map(row =>
                '<tr>' + row.map((cell, idx) => {
                    const align = block.alignments[idx] || 'left';
                    return `<td style="text-align:${align}">${inline(cell)}</td>`;
                }).join('') + '</tr>'
            ).join('');
            return `<div class="table-wrapper"><table class="markdown-table"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
        }

        case 'hr':
            return '<hr>';

        case 'image': {
            const widthStyle = block.width
                ? `width: ${block.width}; height: auto; max-width: 100%;`
                : 'max-width: 100%; height: auto;';
            return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" style="${widthStyle}" loading="lazy" />`;
        }

        case 'footnote_def':
            return ''; // renderMarkdown에서 별도 처리

        default:
            return `<p>${inline((block as Block).raw || '')}</p>`;
    }
}

export function renderBlock(block: Block): string {
    return renderBlockWithRefs(block, new Set());
}

function renderMarkdownWithRefs(text: string, refs: Set<string>): string {
    if (!text) return '';
    const blocks = parseBlocks(text);
    return blocks.map(b => renderBlockWithRefs(b, refs)).join('\n');
}

export function renderMarkdown(text: string): string {
    if (!text) return '';
    try {
        const refs = new Set<string>();
        const blocks = parseBlocks(text);
        let html = blocks.map(b => renderBlockWithRefs(b, refs)).join('\n');

        // 각주 정의 수집
        const footnoteDefs = blocks.filter((b): b is FootnoteDefBlock => b.type === 'footnote_def');
        if (footnoteDefs.length > 0) {
            html += '<section class="footnotes"><hr><ol class="footnote-list">';
            for (const fn of footnoteDefs) {
                html += `<li id="fn-${escapeHtml(fn.id)}" class="footnote-item">`;
                html += `${parseInlineWithRefs(fn.text, refs)} <a href="#fnref-${escapeHtml(fn.id)}" class="footnote-backref">↩</a>`;
                html += '</li>';
            }
            html += '</ol></section>';
        }

        return DOMPurify.sanitize(html);
    } catch (err) {
        // markdownParser 는 errorReporting 을 직접 의존하지 않는다 (순환 회피 + 가벼움).
        // 마크다운 렌더링 오류는 사용자 콘텐츠 문제일 가능성이 커서 외부 리포팅 가치가 낮음.
        if (typeof console !== 'undefined') console.warn('Markdown rendering error:', err);
        return '<p class="error-preview">마크다운 렌더링 오류</p>';
    }
}
