import { describe, it, expect } from 'vitest';
import { parseBlocks, parseInline, renderBlock, slugifyHeading } from '../markdownParser';

describe('slugifyHeading', () => {
  it('converts spaces to hyphens', () => {
    expect(slugifyHeading('Hello World')).toBe('Hello-World');
  });

  it('removes markdown formatting characters', () => {
    expect(slugifyHeading('**bold** and *italic*')).toBe('bold-and-italic');
  });

  it('removes special HTML characters', () => {
    expect(slugifyHeading('A <B> & "C"')).toBe('A-B--C');
  });

  it('trims whitespace', () => {
    expect(slugifyHeading('  hello  ')).toBe('hello');
  });

  it('collapses multiple spaces', () => {
    expect(slugifyHeading('hello   world')).toBe('hello-world');
  });
});

describe('parseInline', () => {
  it('returns empty string for empty input', () => {
    expect(parseInline('')).toBe('');
  });

  it('escapes HTML characters', () => {
    expect(parseInline('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('parses bold text', () => {
    expect(parseInline('**bold**')).toBe('<strong>bold</strong>');
  });

  it('parses italic text', () => {
    expect(parseInline('*italic*')).toBe('<em>italic</em>');
  });

  it('parses strikethrough', () => {
    expect(parseInline('~~deleted~~')).toBe('<del>deleted</del>');
  });

  it('parses inline code', () => {
    expect(parseInline('`code`')).toBe('<code class="inline-code">code</code>');
  });

  it('escapes HTML inside inline code', () => {
    expect(parseInline('`<div>`')).toBe('<code class="inline-code">&lt;div&gt;</code>');
  });

  it('parses links', () => {
    const result = parseInline('[text](https://example.com)');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('text');
  });

  it('parses images', () => {
    const result = parseInline('![alt text](image.png)');
    expect(result).toContain('src="image.png"');
    expect(result).toContain('alt="alt text"');
    expect(result).toContain('loading="lazy"');
  });

  it('parses images with width attribute', () => {
    const result = parseInline('![alt](img.png){width=50%}');
    expect(result).toContain('width: 50%');
  });

  it('parses footnote references', () => {
    const result = parseInline('[^note1]');
    expect(result).toContain('footnote-ref');
    expect(result).toContain('fn-note1');
    expect(result).toContain('fnref-note1');
  });

  it('parses nested bold within italic is handled', () => {
    const result = parseInline('**bold and *nested***');
    expect(result).toContain('<strong>');
  });

  it('converts newlines to <br>', () => {
    expect(parseInline('line1\nline2')).toBe('line1<br>line2');
  });
});

describe('parseBlocks', () => {
  it('returns empty array for empty input', () => {
    expect(parseBlocks('')).toEqual([]);
  });

  it('parses a heading', () => {
    const blocks = parseBlocks('# Hello');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('heading');
    if (blocks[0].type === 'heading') {
      expect(blocks[0].level).toBe(1);
      expect(blocks[0].text).toBe('Hello');
    }
  });

  it('parses heading levels 1-6', () => {
    for (let level = 1; level <= 6; level++) {
      const prefix = '#'.repeat(level);
      const blocks = parseBlocks(`${prefix} Title`);
      expect(blocks).toHaveLength(1);
      if (blocks[0].type === 'heading') {
        expect(blocks[0].level).toBe(level);
      }
    }
  });

  it('parses a paragraph', () => {
    const blocks = parseBlocks('Just some text');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    if (blocks[0].type === 'paragraph') {
      expect(blocks[0].text).toBe('Just some text');
    }
  });

  it('parses multi-line paragraphs', () => {
    const blocks = parseBlocks('line one\nline two');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    if (blocks[0].type === 'paragraph') {
      expect(blocks[0].text).toBe('line one\nline two');
    }
  });

  it('parses a code block', () => {
    const blocks = parseBlocks('```javascript\nconsole.log("hi");\n```');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('code');
    if (blocks[0].type === 'code') {
      expect(blocks[0].lang).toBe('javascript');
      expect(blocks[0].code).toBe('console.log("hi");');
    }
  });

  it('parses a code block without language', () => {
    const blocks = parseBlocks('```\nsome code\n```');
    expect(blocks).toHaveLength(1);
    if (blocks[0].type === 'code') {
      expect(blocks[0].lang).toBe('');
    }
  });

  it('parses horizontal rule', () => {
    expect(parseBlocks('---')[0].type).toBe('hr');
    expect(parseBlocks('***')[0].type).toBe('hr');
    expect(parseBlocks('___')[0].type).toBe('hr');
  });

  it('parses unordered list', () => {
    const blocks = parseBlocks('- item 1\n- item 2\n- item 3');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('unordered_list');
    if (blocks[0].type === 'unordered_list') {
      expect(blocks[0].items).toEqual(['item 1', 'item 2', 'item 3']);
    }
  });

  it('parses ordered list', () => {
    const blocks = parseBlocks('1. first\n2. second');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('ordered_list');
    if (blocks[0].type === 'ordered_list') {
      expect(blocks[0].items).toEqual(['first', 'second']);
    }
  });

  it('parses blockquote', () => {
    const blocks = parseBlocks('> quoted text');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('blockquote');
    if (blocks[0].type === 'blockquote') {
      expect(blocks[0].text).toBe('quoted text');
    }
  });

  it('parses checklist', () => {
    const blocks = parseBlocks('- [ ] unchecked\n- [x] checked');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('checklist');
    if (blocks[0].type === 'checklist') {
      expect(blocks[0].items).toHaveLength(2);
      expect(blocks[0].items[0]).toEqual({ checked: false, text: 'unchecked' });
      expect(blocks[0].items[1]).toEqual({ checked: true, text: 'checked' });
    }
  });

  it('parses image block', () => {
    const blocks = parseBlocks('![alt text](image.png)');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('image');
    if (blocks[0].type === 'image') {
      expect(blocks[0].alt).toBe('alt text');
      expect(blocks[0].src).toBe('image.png');
    }
  });

  it('parses image with width', () => {
    const blocks = parseBlocks('![alt](img.png){width=50%}');
    expect(blocks).toHaveLength(1);
    if (blocks[0].type === 'image') {
      expect(blocks[0].width).toBe('50%');
    }
  });

  it('parses table', () => {
    const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |';
    const blocks = parseBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('table');
    if (blocks[0].type === 'table') {
      expect(blocks[0].headers).toEqual(['Name', 'Age']);
      expect(blocks[0].rows).toEqual([['Alice', '30']]);
    }
  });

  it('parses table with alignment', () => {
    const md = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |';
    const blocks = parseBlocks(md);
    if (blocks[0].type === 'table') {
      expect(blocks[0].alignments).toEqual(['left', 'center', 'right']);
    }
  });

  it('parses math block (multi-line)', () => {
    const blocks = parseBlocks('$$\nE = mc^2\n$$');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('math_block');
    if (blocks[0].type === 'math_block') {
      expect(blocks[0].expr).toBe('E = mc^2');
    }
  });

  it('parses single-line math block', () => {
    const blocks = parseBlocks('$$ E = mc^2 $$');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('math_block');
    if (blocks[0].type === 'math_block') {
      expect(blocks[0].expr).toBe('E = mc^2');
    }
  });

  it('parses footnote definition', () => {
    const blocks = parseBlocks('[^note1]: This is the footnote text.');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('footnote_def');
    if (blocks[0].type === 'footnote_def') {
      expect(blocks[0].id).toBe('note1');
      expect(blocks[0].text).toBe('This is the footnote text.');
    }
  });

  it('skips blank lines between blocks', () => {
    const blocks = parseBlocks('# Heading\n\nParagraph text');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[1].type).toBe('paragraph');
  });

  it('normalizes CRLF line endings', () => {
    const blocks = parseBlocks('# Hello\r\n\r\nWorld');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('heading');
    expect(blocks[1].type).toBe('paragraph');
  });
});

describe('renderBlock', () => {
  it('renders heading with id', () => {
    const html = renderBlock({ type: 'heading', level: 2, text: 'My Title', raw: '## My Title' });
    expect(html).toContain('<h2');
    expect(html).toContain('id="My-Title"');
    expect(html).toContain('My Title');
    expect(html).toContain('</h2>');
  });

  it('renders paragraph', () => {
    const html = renderBlock({ type: 'paragraph', text: 'hello', raw: 'hello' });
    expect(html).toBe('<p class="markdown-paragraph">hello</p>');
  });

  it('renders code block with highlighting', () => {
    const html = renderBlock({ type: 'code', lang: 'javascript', code: 'const x = 1;', raw: '' });
    expect(html).toContain('code-block-wrapper');
    expect(html).toContain('language-javascript');
    expect(html).toContain('code-lang-label');
  });

  it('renders code block without lang', () => {
    const html = renderBlock({ type: 'code', lang: '', code: 'plain text', raw: '' });
    expect(html).toContain('code-block-wrapper');
    expect(html).not.toContain('code-lang-label');
  });

  it('renders horizontal rule', () => {
    expect(renderBlock({ type: 'hr', raw: '---' })).toBe('<hr>');
  });

  it('renders unordered list', () => {
    const html = renderBlock({ type: 'unordered_list', items: ['a', 'b'], raw: '' });
    expect(html).toContain('<ul class="markdown-list">');
    expect(html).toContain('<li>a</li>');
    expect(html).toContain('<li>b</li>');
  });

  it('renders ordered list', () => {
    const html = renderBlock({ type: 'ordered_list', items: ['first', 'second'], raw: '' });
    expect(html).toContain('<ol class="markdown-list">');
  });

  it('renders checklist', () => {
    const html = renderBlock({
      type: 'checklist',
      items: [
        { checked: true, text: 'done' },
        { checked: false, text: 'todo' },
      ],
      raw: '',
    });
    expect(html).toContain('markdown-checklist');
    expect(html).toContain('checked');
    expect(html).toContain('done');
    expect(html).toContain('todo');
  });

  it('renders image', () => {
    const html = renderBlock({ type: 'image', alt: 'photo', src: 'pic.jpg', width: null, raw: '' });
    expect(html).toContain('src="pic.jpg"');
    expect(html).toContain('alt="photo"');
    expect(html).toContain('loading="lazy"');
  });

  it('renders image with custom width', () => {
    const html = renderBlock({ type: 'image', alt: '', src: 'pic.jpg', width: '50%', raw: '' });
    expect(html).toContain('width: 50%');
  });

  it('renders table', () => {
    const html = renderBlock({
      type: 'table',
      headers: ['A', 'B'],
      alignments: ['left', 'right'],
      rows: [['1', '2']],
      raw: '',
    });
    expect(html).toContain('<table class="markdown-table">');
    expect(html).toContain('<th style="text-align:left">A</th>');
    expect(html).toContain('<th style="text-align:right">B</th>');
    expect(html).toContain('<td style="text-align:left">1</td>');
  });

  it('renders footnote_def as empty string', () => {
    const html = renderBlock({ type: 'footnote_def', id: 'note', text: 'text', raw: '' });
    expect(html).toBe('');
  });
});
