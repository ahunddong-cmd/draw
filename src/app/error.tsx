"use client"; // 에러 경계는 반드시 클라이언트 컴포넌트여야 한다.

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

// page.tsx와 그 하위 세그먼트(/manual 등)에서 발생한 렌더링 에러를 잡는다.
// 루트 layout.tsx까지 터진 경우는 global-error.tsx가 처리한다.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // 예기치 못한 에러를 관리자에게 알린다.
    reportError(error, { source: "error-boundary", digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="text-5xl">⚠️</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white">일시적인 문제가 발생했습니다</h1>
        <p className="text-sm text-slate-400">
          잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.
        </p>
      </div>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-full border border-orange-300/50 bg-orange-500 px-8 py-3 text-lg font-bold text-white shadow-[0_0_25px_rgba(249,115,22,0.45)] active:shadow-[0_0_10px_rgba(249,115,22,0.3)]"
      >
        다시 시도
      </button>
    </div>
  );
}
