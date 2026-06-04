export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function slugifyHeading(text: string): string {
    return text
        .replace(/[*_~`[\]()]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/["<>&]/g, '');
}
