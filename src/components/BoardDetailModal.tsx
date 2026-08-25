"use client";

import { rankLabel, type BoardCell, type Tier } from "@/lib/lottery";

type Props = {
  board: BoardCell[];
  tiers: Tier[];
  onClose: () => void;
};

export default function BoardDetailModal({ board, tiers, onClose }: Props) {
  const total = board.length;
  const drawn = board.filter((cell) => cell.revealed).length;
  const remaining = total - drawn;

  const byRank = tiers
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((tier) => {
      const cellsForRank = board.filter((cell) => cell.rank === tier.rank);
      return {
        rank: tier.rank,
        total: cellsForRank.length,
        remaining: cellsForRank.filter((cell) => !cell.revealed).length,
      };
    });
  // 등수별 합계만으로는 확인이 안 되니, 꽝의 전체/남은 개수도 함께 보여준다.
  const loseCells = board.filter((cell) => cell.rank === null);
  const loseTotal = loseCells.length;
  const loseRemaining = loseCells.filter((cell) => !cell.revealed).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-80 flex-col gap-4 rounded-2xl border border-orange-500/30 bg-[#1f140a] p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold text-white">뽑기 현황 상세</h2>

        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">전체 수량</span>
            <span className="font-semibold text-white">{total}개</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">뽑은 수량</span>
            <span className="font-semibold text-white">{drawn}개</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">남은 수량</span>
            <span className="font-semibold text-orange-300">{remaining}개</span>
          </div>
        </div>

        <div className="h-px bg-orange-500/20" />

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-slate-400">등수별 전체 / 남은 수량</span>
          {byRank.map(({ rank, total: rankTotal, remaining: rankRemaining }) => (
            <div key={rank} className="flex items-center justify-between">
              <span className="flex h-7 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                {rankLabel(rank)}
              </span>
              <span className="text-slate-200">
                전체 {rankTotal}개 / 남은{" "}
                <span className="font-semibold text-orange-300">{rankRemaining}개</span>
              </span>
            </div>
          ))}
          {loseTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-12 shrink-0 items-center justify-center rounded-full border border-slate-600 text-xs font-bold text-slate-300">
                꽝
              </span>
              <span className="text-slate-200">
                전체 {loseTotal}개 / 남은{" "}
                <span className="font-semibold text-orange-300">{loseRemaining}개</span>
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 rounded-full bg-orange-500 py-2 font-semibold text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
}
