"use client"; // 에러 경계는 반드시 클라이언트 컴포넌트여야 한다.

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

// 루트 layout.tsx까지 터진 최악의 경우를 잡는 최종 방어선.
// 이 화면은 globals.css를 불러오지 않으므로 스타일을 인라인으로 직접 지정한다.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportError(error, { source: "global-error", digest: error.digest });
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "4rem 1.5rem",
          textAlign: "center",
          background: "#120b05",
          color: "#f7f1ea",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <p style={{ fontSize: "3rem", margin: 0 }}>⚠️</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          화면을 표시할 수 없습니다
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#94a3b8", margin: 0 }}>
          잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            border: "none",
            borderRadius: "9999px",
            background: "#f97316",
            color: "#fff",
            fontSize: "1.125rem",
            fontWeight: 700,
            padding: "0.75rem 2rem",
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
