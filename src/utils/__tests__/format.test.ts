import { describe, it, expect } from 'vitest';
import { stripMarkdown, formatDate } from '../format';

describe('stripMarkdown', () => {
  it('removes image syntax', () => {
    expect(stripMarkdown('![alt](url)')).toBe('');
  });

  it('converts links to just link text', () => {
    expect(stripMarkdown('[click here](https://example.com)')).toBe('click here');
  });

  it('removes heading markers', () => {
    expect(stripMarkdown('## Hello World')).toBe('Hello World');
  });

  it('removes bold/italic/strikethrough markers', () => {
    expect(stripMarkdown('**bold** and *italic* and ~~deleted~~')).toBe('bold and italic and deleted');
  });

  it('removes backticks', () => {
    expect(stripMarkdown('`code`')).toBe('code');
  });

  it('removes blockquote markers', () => {
    expect(stripMarkdown('> quoted')).toBe('quoted');
  });

  it('collapses newlines to spaces', () => {
    expect(stripMarkdown('line1\n\nline2')).toBe('line1 line2');
  });

  it('trims result', () => {
    expect(stripMarkdown('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(stripMarkdown('')).toBe('');
  });
});

describe('formatDate', () => {
  it('formats a valid date string', () => {
    expect(formatDate('2024-03-15T10:30:00Z')).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('');
  });

  it('pads month and day with zeros', () => {
    // January 5 should be 01.05
    const result = formatDate('2024-01-05T00:00:00Z');
    expect(result).toMatch(/2024\.01\.0[45]/); // timezone may shift the day
  });
});
