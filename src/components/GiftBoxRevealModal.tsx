"use client";

import { useState } from "react";

type Props = {
  number: number;
  onConfirm: () => void;
  onCancel: () => void;
};

// 상자가 열리는 연출이 끝난 뒤 실제 결과(등수 팝업)를 보여주기까지의 지연 시간
const OPEN_DELAY_MS = 450;

export default function GiftBoxRevealModal({ number, onConfirm, onCancel }: Props) {
  const [isOpening, setIsOpening] = useState(false);

  function handleYes() {
    if (isOpening) return;
    setIsOpening(true);
    setTimeout(onConfirm, OPEN_DELAY_MS);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="flex w-72 flex-col items-center gap-5 rounded-2xl border border-orange-500/30 bg-[#1f140a] p-6 text-center shadow-2xl animate-[card-flip-in_0.4s_ease-out]">
        {/* eslint-disable-next-line @next/next/no-img-element -- 상자 오픈 연출용 고정 UI 이미지라 next/image 최적화 대상이 아니다 */}
        <img
          src="/gift-box-closed.png"
          alt="선물상자"
          className={
            // 기존 h-40 w-40(160px) 대비 30% 확대
            "h-52 w-52 object-contain " + (isOpening ? "animate-[box-burst_0.45s_ease-out_forwards]" : "")
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
            disabled={isOpening}
            className="flex-1 rounded-full border border-slate-600 py-2 font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            아니오
          </button>
          <button
            type="button"
            onClick={handleYes}
            disabled={isOpening}
            className="flex-1 rounded-full bg-orange-500 py-2 font-semibold text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            예
          </button>
        </div>
      </div>
    </div>
  );
}
