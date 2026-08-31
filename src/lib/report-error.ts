// 예기치 못한 에러를 서버(/api/report-error)로 보고하는 클라이언트 유틸.
// 에러 경계(error.tsx, global-error.tsx)와 전역 리스너(ErrorReporter)에서 공용으로 쓴다.

export type ErrorContext = {
  // 에러가 어디서 잡혔는지 구분용 (예: "error-boundary", "window.onerror")
  source: string;
  digest?: string;
};

// 같은 에러로 서버에 요청이 폭주하지 않도록 브라우저에서도 1차로 짧게 중복을 막는다.
// (서버에서 한 번 더, 더 긴 창으로 걸러낸다.)
const recentlyReported = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60_000;

export function reportError(error: unknown, context: ErrorContext): void {
  try {
    const message =
      error instanceof Error ? error.message : String(error ?? "알 수 없는 에러");
    const stack = error instanceof Error ? error.stack : undefined;

    const key = `${context.source}:${message}`;
    const now = Date.now();
    const last = recentlyReported.get(key);
    if (last && now - last < DEDUPE_WINDOW_MS) return;
    recentlyReported.set(key, now);

    const payload = JSON.stringify({
      message,
      stack,
      digest: context.digest,
      source: context.source,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      occurredAt: new Date().toISOString(),
    });

    // 에러 직후 페이지가 사라질 수도 있으므로 sendBeacon을 우선 사용한다.
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/report-error", blob);
      return;
    }

    void fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    // 보고 자체가 실패해도 앱 동작에 영향을 주면 안 되므로 조용히 넘어간다.
  }
}
