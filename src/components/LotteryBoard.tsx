"use client";

import { useState } from "react";
import Image from "next/image";
import { rankLabel, type BoardCell, type Tier } from "@/lib/lottery";
import { SETTINGS_PIN } from "@/lib/auth";
import { playFireworkSound } from "@/lib/sound";
import ResultModal from "@/components/ResultModal";
import PinModal from "@/components/PinModal";
import PrizeTable from "@/components/PrizeTable";
import PrizeGoodsImage from "@/components/PrizeGoodsImage";
import QrCodePanel from "@/components/QrCodePanel";

type Props = {
  board: BoardCell[];
  tiers: Tier[];
  qrCodeUrl: string | null;
  prizeImageUrl: string | null;
  guideText: string;
  onReveal: (id: number) => void;
  onReset: () => void;
};

export default function LotteryBoard({
  board,
  tiers,
  qrCodeUrl,
  prizeImageUrl,
  guideText,
  onReveal,
  onReset,
}: Props) {
  const [activeCell, setActiveCell] = useState<BoardCell | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const remaining = board.filter((cell) => !cell.revealed).length;
  const finished = remaining === 0;

  function handlePinSubmit(pin: string) {
    if (pin === SETTINGS_PIN) {
      setShowPinModal(false);
      setPinError(null);
      onReset();
    } else {
      setPinError("비밀번호가 올바르지 않습니다");
    }
  }

  function handleCellClick(cell: BoardCell) {
    onReveal(cell.id);
    setActiveCell(cell); // 클릭한 칸의 결과를 화면 중앙 팝업으로 보여준다.
    if (cell.rank !== null) {
      playFireworkSound(cell.rank); // 클릭(사용자 제스처) 안에서 재생해야 브라우저 자동재생 정책에 걸리지 않는다.
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <Image
        src="/board-background.png"
        alt=""
        aria-hidden="true"
        width={1024}
        height={1536}
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-auto w-full opacity-50"
      />

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">디지털 종이뽑기</h1>
            <p className="text-sm text-slate-400">
              남은 뽑기 {remaining} / 전체 {board.length}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-orange-400 hover:text-orange-300"
          >
            처음부터 다시
          </button>
        </div>

        {guideText && (
          <p className="rounded-xl border border-orange-500/20 bg-[#1f140a]/60 p-3 text-center text-[18px] text-slate-200">
            {guideText}
          </p>
        )}

        <div
          className={
            "flex flex-col items-center gap-4 sm:grid sm:items-start " +
            (qrCodeUrl ? "sm:grid-cols-[1.1fr_1fr_0.8fr]" : "sm:grid-cols-[1.2fr_1fr]")
          }
        >
          <div className="w-full min-w-0">
            <PrizeTable tiers={tiers} />
          </div>
          <PrizeGoodsImage src={prizeImageUrl} />
          <QrCodePanel src={qrCodeUrl} />
        </div>

        {finished && (
          <div className="rounded-xl border border-orange-400/40 bg-orange-500/10 p-4 text-center font-semibold text-orange-200">
            모든 뽑기가 완료되었습니다
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2">
          {board.map((cell) => (
            <button
              key={cell.id}
              type="button"
              onClick={() => handleCellClick(cell)}
              disabled={cell.revealed}
              aria-label={
                cell.revealed
                  ? cell.rank
                    ? `${cell.id + 1}번, ${rankLabel(cell.rank)} 당첨`
                    : `${cell.id + 1}번, 꽝`
                  : `${cell.id + 1}번, 뽑지 않음`
              }
              className={
                "flex aspect-square items-center justify-center rounded-lg text-sm font-bold transition-all " +
                (!cell.revealed
                  ? "border border-orange-500/30 bg-[#1f140a] text-slate-200 shadow-[0_0_10px_rgba(249,115,22,0.18)] active:border-orange-300 active:shadow-[0_0_18px_rgba(249,115,22,0.5)]"
                  : cell.rank
                    ? "bg-orange-500 text-white"
                    : "border border-slate-700 bg-slate-800/70 text-slate-500")
              }
            >
              {!cell.revealed ? "?" : cell.rank ? rankLabel(cell.rank) : "꽝"}
            </button>
          ))}
        </div>

        {activeCell && (
          <ResultModal
            rank={activeCell.rank}
            prize={tiers.find((tier) => tier.rank === activeCell.rank)?.prize}
            imageUrl={tiers.find((tier) => tier.rank === activeCell.rank)?.resultImageUrl}
            onClose={() => setActiveCell(null)}
          />
        )}

        {showPinModal && (
          <PinModal
            onSubmit={handlePinSubmit}
            onCancel={() => {
              setShowPinModal(false);
              setPinError(null);
            }}
            error={pinError}
          />
        )}
      </div>
    </div>
  );
}
