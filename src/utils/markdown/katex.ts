import { escapeHtml } from './text';

// ─── KaTeX 지연 로드 ───
// 수식이 포함된 콘텐츠를 실제로 렌더링할 때까지 KaTeX(약 260KB)를 로드하지 않는다.
// 모듈/CSS가 도착하면 구독자에게 알려 콘텐츠를 재렌더하도록 한다.

interface KatexModule {
    renderToString(expr: string, options: { displayMode: boolean; throwOnError: boolean }): string;
}

let katexModule: KatexModule | null = null;
let katexLoading: Promise<KatexModule> | null = null;
const katexReadyCallbacks = new Set<() => void>();

function notifyKatexReady(): void {
    katexReadyCallbacks.forEach((cb) => {
        try { cb(); } catch { /* 구독자 오류는 무시 */ }
    });
}

export function subscribeKatexReady(cb: () => void): () => void {
    katexReadyCallbacks.add(cb);
    return () => { katexReadyCallbacks.delete(cb); };
}

export function isKatexReady(): boolean {
    return katexModule !== null;
}

// 콘텐츠에 수식이 포함되어 있는지 빠르게 검사 — `$$...$$` 블록 또는 `$...$` 인라인.
export function hasMath(text: string): boolean {
    if (!text) return false;
    if (text.indexOf('$$') !== -1) return true;
    return /(?<!\$)\$[^$\n]+?\$/.test(text);
}

function loadKatex(): Promise<KatexModule> {
    if (katexModule) return Promise.resolve(katexModule);
    if (katexLoading) return katexLoading;
    katexLoading = Promise.all([
        import('katex') as Promise<{ default?: KatexModule } & KatexModule>,
        import('katex/dist/katex.min.css'),
    ]).then(([m]) => {
        katexModule = (m.default || m) as KatexModule;
        notifyKatexReady();
        return katexModule;
    });
    return katexLoading;
}

export function renderKatex(expr: string, displayMode: boolean): string {
    if (!katexModule) {
        // 아직 로드되지 않았으면 지금 시작하고 일단 원본 표현식을 표시한다.
        // 로드 완료 시 subscribeKatexReady 구독자가 재렌더를 일으킨다.
        void loadKatex();
        const tag = displayMode ? 'div' : 'span';
        return `<${tag} class="math-pending">${escapeHtml(expr)}</${tag}>`;
    }
    try {
        return katexModule.renderToString(expr, { displayMode, throwOnError: false });
    } catch {
        return `<span class="katex-error">${escapeHtml(expr)}</span>`;
    }
}
