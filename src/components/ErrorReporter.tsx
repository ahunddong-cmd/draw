"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

// 에러 경계가 잡지 못하는 에러(이벤트 핸들러 예외, 미처리 Promise 거부 등)를
// 전역에서 감지해 관리자에게 알린다. layout.tsx에 마운트되어 있으면 된다.
export default function ErrorReporter() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      reportError(event.error ?? event.message, { source: "window.onerror" });
    }
    function handleRejection(event: PromiseRejectionEvent) {
      reportError(event.reason, { source: "unhandledrejection" });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
