import { marked } from 'marked';
import hljs from 'highlight.js';

let configured = false;

export function configureMarked() {
    if (configured) return;
    configured = true;

    marked.setOptions({
        breaks: true,
        gfm: true,
        pedantic: false,
    });

    marked.use({
        async: false,
        pedantic: false,
        gfm: true,
        breaks: true,
        renderer: {
            code(code, language) {
                const validLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
                const highlighted = hljs.highlight(code, { language: validLanguage, ignoreIllegals: true }).value;
                return `<pre><code class="hljs language-${validLanguage}">${highlighted}</code></pre>`;
            },
            codespan(code) {
                return `<code class="inline-code">${code}</code>`;
            },
            link(href, title, text) {
                return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            },
            image(href, title, text) {
                return `<img src="${href}" alt="${text}" title="${title || ''}" style="max-width: 100%; height: auto;" />`;
            },
            table(header, body) {
                return `<table class="markdown-table"><thead>${header}</thead><tbody>${body}</tbody></table>`;
            },
            blockquote(quote) {
                return `<blockquote class="markdown-blockquote">${quote}</blockquote>`;
            },
            list(body, ordered) {
                const tag = ordered ? 'ol' : 'ul';
                return `<${tag} class="markdown-list">${body}</${tag}>`;
            },
            heading(text, level) {
                return `<h${level} class="markdown-heading">${text}</h${level}>`;
            },
            paragraph(text) {
                return `<p class="markdown-paragraph">${text}</p>`;
            }
        }
    });
}

export function renderMarkdown(text) {
    if (!text) return '';
    try {
        configureMarked();
        return marked(text);
    } catch (err) {
        console.error('Markdown rendering error:', err);
        return '<p class="error-preview">마크다운 렌더링 오류</p>';
    }
}
