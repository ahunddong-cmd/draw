"use client";

import { useState } from "react";
import {
  MAX_PARTICIPANTS,
  MAX_TIERS,
  MIN_PARTICIPANTS,
  isSettingsValid,
  rankLabel,
  tierWinCount,
  totalRatio,
  type LotterySettings,
  type Tier,
} from "@/lib/lottery";
import PrizeTable from "@/components/PrizeTable";
import QrCodePanel from "@/components/QrCodePanel";
import { usePersistedText } from "@/lib/usePersistedText";

const EVENT_TITLE_STORAGE_KEY = "digital-lottery:eventTitle";
const GUIDE_TEXT_STORAGE_KEY = "digital-lottery:guideText";

const DEFAULT_PARTICIPANT_COUNT = 500;

// 기본값: 500명 기준 1등 1명·2등 3명·3등 16명·4등 100명·5등 380명, 꽝 없음
const DEFAULT_TIERS: Tier[] = [
  { rank: 1, ratio: 0.2, prize: "비트코인방석 + 대형 팝콘 2개" },
  { rank: 2, ratio: 0.6, prize: "빗썸 키캡키링 + 대형 팝콘 1개" },
  { rank: 3, ratio: 3.2, prize: "소형 팝콘 2개" },
  { rank: 4, ratio: 20, prize: "소형 팝콘 1개" },
  { rank: 5, ratio: 76, prize: "비트코인 초콜릿 2개" },
];

type Props = {
  onStart: (settings: LotterySettings) => void;
};

export default function SettingsForm({ onStart }: Props) {
  const [participantCount, setParticipantCount] = useState(DEFAULT_PARTICIPANT_COUNT);
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = usePersistedText(EVENT_TITLE_STORAGE_KEY);
  const [guideText, setGuideText] = usePersistedText(GUIDE_TEXT_STORAGE_KEY);

  const settings: LotterySettings = {
    participantCount,
    tiers,
    qrCodeDataUrl,
    eventTitle,
    guideText,
  };
  const ratioSum = totalRatio(tiers);
  const winCount = tiers.reduce(
    (sum, tier) => sum + tierWinCount(participantCount, tier.ratio),
    0,
  );
  const loseCount = participantCount - winCount;
  const valid = isSettingsValid(settings);

  function updateRatio(rank: number, ratio: number) {
    setTiers((prev) =>
      prev.map((tier) => (tier.rank === rank ? { ...tier, ratio } : tier)),
    );
  }

  function updatePrize(rank: number, prize: string) {
    setTiers((prev) =>
      prev.map((tier) => (tier.rank === rank ? { ...tier, prize } : tier)),
    );
  }

  function addTier() {
    if (tiers.length >= MAX_TIERS) return;
    const nextRank = tiers.length + 1;
    setTiers((prev) => [...prev, { rank: nextRank, ratio: 5, prize: "" }]);
  }

  function removeTier(rank: number) {
    setTiers((prev) =>
      prev
        .filter((tier) => tier.rank !== rank)
        // 등수를 삭제하면 뒤 등수를 앞으로 당겨서 항상 1등부터 연속되게 유지한다.
        .map((tier, index) => ({ ...tier, rank: index + 1 })),
    );
  }

  function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setQrCodeDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          디지털 종이뽑기 설정
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          참여자 수와 등수별 당첨 비율을 설정한 뒤 뽑기를 시작하세요.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-5">
        <label className="text-lg font-semibold text-white">행사 문구 (선택)</label>
        <p className="text-sm text-slate-400">
          로고 옆에 노출할 문구입니다. 비워두면 로고만 표시됩니다.
        </p>
        <input
          type="text"
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
          placeholder="예: X 연세대학교 가을 축제"
          className="w-full rounded-lg border border-orange-500/30 bg-[#120b05] px-3 py-2 text-white placeholder:text-slate-600"
        />
        {eventTitle && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white px-4 py-3">
            <span className="text-sm font-bold text-zinc-500">빗썸 로고</span>
            <span className="text-[25px] font-bold text-zinc-800">{eventTitle}</span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-5">
        <label className="text-lg font-semibold text-white">
          이벤트 참여 안내 문구 (선택)
        </label>
        <p className="text-sm text-slate-400">
          뽑기판의 굿즈 목록 위에 노출됩니다. (예: 참여 방법, 유의사항 등)
        </p>
        <textarea
          value={guideText}
          onChange={(e) => setGuideText(e.target.value)}
          placeholder="예: 인스타그램 팔로우 후 화면을 터치해 뽑기에 참여해주세요!"
          rows={3}
          className="w-full resize-none rounded-lg border border-orange-500/30 bg-[#120b05] px-3 py-2 text-sm text-white placeholder:text-slate-600"
        />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-5">
        <label className="text-lg font-semibold text-white">QR 코드 (선택)</label>
        <p className="text-sm text-slate-400">
          SNS 구독·팔로우 안내용 QR 이미지를 올리면 뽑기판 화면에 노출됩니다.
        </p>
        <div className="flex items-center gap-4">
          {qrCodeDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- 업로드한 QR은 data URL이라 next/image 최적화 대상이 아니다
            <img
              src={qrCodeDataUrl}
              alt="업로드된 QR 코드"
              className="h-24 w-24 rounded-lg border border-orange-500/30 bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-slate-600 text-xs text-slate-500">
              QR 없음
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer rounded-full border border-orange-400 px-4 py-2 text-center text-sm font-medium text-orange-300">
              {qrCodeDataUrl ? "다른 이미지로 변경" : "이미지 업로드"}
              <input
                type="file"
                accept="image/*"
                onChange={handleQrUpload}
                className="hidden"
              />
            </label>
            {qrCodeDataUrl && (
              <button
                type="button"
                onClick={() => setQrCodeDataUrl(null)}
                className="text-sm text-slate-500 hover:text-red-400"
              >
                제거
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-5">
        <label className="text-lg font-semibold text-white">
          참여자 수 <span className="text-orange-300">({participantCount}명)</span>
        </label>
        <input
          type="range"
          min={MIN_PARTICIPANTS}
          max={MAX_PARTICIPANTS}
          step={10}
          value={participantCount}
          onChange={(e) => setParticipantCount(Number(e.target.value))}
          className="h-3 w-full accent-orange-400"
        />
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={MIN_PARTICIPANTS}
            max={MAX_PARTICIPANTS}
            value={participantCount}
            onChange={(e) => setParticipantCount(Number(e.target.value))}
            className="w-28 rounded-lg border border-orange-500/30 bg-[#120b05] px-3 py-2 text-lg text-white"
          />
          <span className="text-sm text-slate-400">
            {MIN_PARTICIPANTS}명 ~ {MAX_PARTICIPANTS}명
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-lg font-semibold text-white">등수별 당첨 비율</label>
          <button
            type="button"
            onClick={addTier}
            disabled={tiers.length >= MAX_TIERS}
            className="rounded-full border border-orange-400 px-3 py-1.5 text-sm font-medium text-orange-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600"
          >
            + 등수 추가
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {tiers.map((tier) => (
            <div
              key={tier.rank}
              className="flex flex-col gap-2 rounded-xl border border-orange-500/20 bg-[#1f140a]/60 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-12 shrink-0 font-semibold text-white">
                  {rankLabel(tier.rank)}
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={tier.ratio}
                  onChange={(e) => updateRatio(tier.rank, Number(e.target.value))}
                  className="w-20 rounded-lg border border-orange-500/30 bg-[#120b05] px-2 py-1.5 text-right text-white"
                />
                <span className="text-slate-400">%</span>
                <span className="ml-auto text-sm text-slate-400">
                  {tierWinCount(participantCount, tier.ratio)}명 당첨
                </span>
                <button
                  type="button"
                  onClick={() => removeTier(tier.rank)}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:text-red-400"
                  aria-label={`${rankLabel(tier.rank)} 삭제`}
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={tier.prize}
                onChange={(e) => updatePrize(tier.rank, e.target.value)}
                placeholder="예: 대형방석 + 대형 팝콘 2개"
                aria-label={`${rankLabel(tier.rank)} 굿즈`}
                className="w-full rounded-lg border border-orange-500/20 bg-[#120b05] px-3 py-1.5 text-sm text-white placeholder:text-slate-600"
              />
            </div>
          ))}
        </div>

        <p
          className={
            ratioSum > 100
              ? "text-sm font-medium text-red-400"
              : "text-sm text-slate-400"
          }
        >
          비율 합계 {ratioSum}% (당첨 {winCount}명 / 꽝 {loseCount}명 / 전체{" "}
          {participantCount}명)
          {ratioSum > 100 && " — 100%를 넘을 수 없습니다"}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-lg font-semibold text-white">미리보기</label>
        {guideText && (
          <p className="rounded-xl border border-orange-500/20 bg-[#1f140a]/60 p-3 text-center text-sm text-slate-200">
            {guideText}
          </p>
        )}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="w-full min-w-0 flex-1">
            <PrizeTable tiers={tiers} />
          </div>
          <QrCodePanel src={qrCodeDataUrl} />
        </div>
      </section>

      <button
        type="button"
        onClick={() => valid && onStart(settings)}
        disabled={!valid}
        className="mt-4 rounded-full border border-orange-300/50 bg-orange-500 py-4 text-lg font-bold text-white shadow-[0_0_25px_rgba(249,115,22,0.45)] transition-shadow active:shadow-[0_0_10px_rgba(249,115,22,0.3)] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
      >
        뽑기 시작하기
      </button>
    </div>
  );
}
