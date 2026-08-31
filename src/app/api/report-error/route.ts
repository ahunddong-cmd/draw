import { NextResponse } from "next/server";

// 클라이언트가 보고한 예기치 못한 에러를 받아 관리자에게 메일로 알린다.
// 키오스크 한 대 규모라 별도 큐 없이 라우트 안에서 바로 메일을 보낸다.

type ErrorReport = {
  message?: string;
  stack?: string;
  digest?: string;
  source?: string;
  url?: string;
  userAgent?: string;
  occurredAt?: string;
};

// --- 폭주 방지 (서버 인스턴스 메모리 기반, 재시작 시 초기화됨) ---
// 1) 같은 (source + message) 조합은 이 창 안에서 한 번만 메일
const DEDUPE_WINDOW_MS = 5 * 60_000;
const lastSentAt = new Map<string, number>();
// 2) 서로 다른 에러가 쏟아져도 전체 발송량 제한
const RATE_WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 10;
let windowStart = Date.now();
let countInWindow = 0;

export async function POST(request: Request) {
  try {
    const report = (await request.json()) as ErrorReport;
    const message = (report.message || "알 수 없는 에러").slice(0, 500);
    const source = report.source || "unknown";
    const now = Date.now();

    // 1) 동일 에러 중복 제거
    const key = `${source}:${message}`;
    const last = lastSentAt.get(key);
    if (last && now - last < DEDUPE_WINDOW_MS) {
      return NextResponse.json({ skipped: "deduped" });
    }

    // 2) 전체 발송량 제한
    if (now - windowStart > RATE_WINDOW_MS) {
      windowStart = now;
      countInWindow = 0;
    }
    if (countInWindow >= MAX_PER_WINDOW) {
      return NextResponse.json({ skipped: "rate-limited" });
    }

    lastSentAt.set(key, now);
    countInWindow += 1;

    await sendAdminEmail(report, message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // 보고 API 자체가 실패해도 여기서 또 알림을 보내면 루프가 되므로 로그만 남긴다.
    console.error("[report-error] 관리자 알림 전송 실패:", err);
    return NextResponse.json({ ok: false });
  }
}

async function sendAdminEmail(report: ErrorReport, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL || "ahunddong@gmail.com";
  // Resend에서 도메인 인증 전이면 onboarding@resend.dev로만 발신할 수 있다.
  const from = process.env.ERROR_ALERT_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    // 키가 없으면 메일을 보내지 않고 서버 로그만 남긴다. (앱은 정상 동작)
    console.warn(
      "[report-error] RESEND_API_KEY 미설정 — 메일 없이 로그만 남깁니다.",
      { message, source: report.source, url: report.url },
    );
    return;
  }

  const body = [
    `메시지: ${message}`,
    `발생 위치: ${report.source ?? "-"}`,
    `URL: ${report.url ?? "-"}`,
    `발생 시각: ${report.occurredAt ?? new Date().toISOString()}`,
    `User-Agent: ${report.userAgent ?? "-"}`,
    report.digest ? `digest: ${report.digest}` : null,
    "",
    "스택 트레이스:",
    report.stack ?? "(없음)",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `종이뽑기 에러알림 <${from}>`,
      to: [to],
      subject: `[종이뽑기] 에러 발생: ${message.slice(0, 80)}`,
      text: body,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend 응답 ${res.status}: ${detail}`);
  }
}
