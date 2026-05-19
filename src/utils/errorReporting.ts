/**
 * 통합 에러 리포팅 진입점.
 *
 * VITE_SENTRY_DSN 환경변수가 설정되어 있을 때만 Sentry 를 동적 로드해 초기화한다.
 * DSN 이 없으면 captureException 은 console.error 로 폴백 — 운영 환경에 DSN 만 추가하면 즉시 작동.
 *
 * Sentry 모듈은 dynamic import 로 별도 청크에 분리되어 DSN 없을 때 다운로드되지 않는다.
 */

type CaptureFn = (err: unknown, context?: Record<string, unknown>) => void;

const consoleCapture: CaptureFn = (err, context) => {
    if (context) console.error('[Error]', err, context);
    else console.error('[Error]', err);
};

let capture: CaptureFn = consoleCapture;
let initialized = false;

/**
 * 앱 부팅 시 1회 호출. DSN 이 있으면 Sentry 를 비동기로 로드/초기화.
 * 초기화가 끝나기 전에 발생한 에러는 console 로만 기록된다 (드물고 큰 문제 아님).
 */
export function initErrorReporting(): void {
    if (initialized) return;
    initialized = true;

    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn || typeof window === 'undefined') return;

    import('@sentry/react')
        .then((Sentry) => {
            Sentry.init({
                dsn,
                environment: import.meta.env.MODE,
                // 트래픽이 적은 1인 블로그 가정 — 100% 샘플링 (비용 우려 시 조정)
                tracesSampleRate: 0,
                replaysSessionSampleRate: 0,
                replaysOnErrorSampleRate: 0,
            });
            capture = (err, context) => {
                Sentry.captureException(err, context ? { extra: context } : undefined);
            };
        })
        .catch(() => {
            // Sentry 로드 자체에 실패하면 폴백 유지
        });
}

/**
 * 에러를 리포팅 백엔드(또는 콘솔 폴백)로 보낸다.
 * 사용자에게 보여줄 메시지는 별도로 toast 등으로 처리할 것.
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
    capture(err, context);
}
