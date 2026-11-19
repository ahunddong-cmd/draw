"use client";

import { useState } from "react";

type Props = {
  number: number;
  onConfirm: () => void;
  onCancel: () => void;
};

type Phase = "idle" | "shaking" | "open";

// "예"를 누르면 먼저 상자가 흔들리다가, 열린 상자 이미지로 바뀌어 잠시 보여준 뒤
// 실제 결과(등수 팝업)로 넘어간다.
const SHAKE_MS = 400;
const OPEN_HOLD_MS = 500;

export default function GiftBoxRevealModal({ number, onConfirm, onCancel }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");

  function handleYes() {
    if (phase !== "idle") return;
    setPhase("shaking");
    setTimeout(() => {
      setPhase("open");
      setTimeout(onConfirm, OPEN_HOLD_MS);
    }, SHAKE_MS);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="flex w-72 flex-col items-center gap-5 rounded-2xl border border-orange-500/30 bg-[#1f140a] p-6 text-center shadow-2xl animate-[card-flip-in_0.4s_ease-out]">
        {/* eslint-disable-next-line @next/next/no-img-element -- 상자 오픈 연출용 고정 UI 이미지라 next/image 최적화 대상이 아니다 */}
        <img
          src={phase === "open" ? "/gift-box-open.png" : "/gift-box-closed.png"}
          alt="선물상자"
          className={
            // 기존 h-40 w-40(160px) 대비 30% 확대
            "h-52 w-52 object-contain " +
            (phase === "shaking"
              ? "animate-[box-shake_0.4s_ease-in-out]"
              : phase === "open"
                ? "animate-[box-open-pop_0.3s_ease-out]"
                : "")
          }
        />
        <p className="text-lg font-semibold text-white">
          {/* 기존 text-lg(18px) 대비 20% 확대 */}
          <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[21.6px]">{number}번</span>{" "}
          <span className="whitespace-nowrap">선물상자를 열어볼까요?</span>
        </p>
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={phase !== "idle"}
            className="flex-1 rounded-full border border-slate-600 py-2 font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            아니오
          </button>
          <button
            type="button"
            onClick={handleYes}
            disabled={phase !== "idle"}
            className="flex-1 rounded-full bg-orange-500 py-2 font-semibold text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            예
          </button>
        </div>
      </div>
    </div>
  );
}
