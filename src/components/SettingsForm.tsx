"use client";

import { useEffect, useState } from "react";
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
import PrizeGoodsImage from "@/components/PrizeGoodsImage";
import QrCodePanel from "@/components/QrCodePanel";
import PinModal from "@/components/PinModal";

const DEFAULT_PARTICIPANT_COUNT = 500;

// 기본값: 500명 기준 1등 1명·2등 3명·3등 16명·4등 100명·5등 380명, 꽝 없음
// resultImageUrl은 최초 설정 시 기본으로 등록해둔 등수별 당첨 이미지(Supabase Storage)다.
const DEFAULT_TIERS: Tier[] = [
  {
    rank: 1,
    ratio: 0.2,
    prize: "비트코인방석 + 대형 팝콘 2개",
    resultImageUrl:
      "https://lwuqktbiyceddeqimgxt.supabase.co/storage/v1/object/public/lottery-assets/rank-1-image.png",
  },
  {
    rank: 2,
    ratio: 0.6,
    prize: "빗썸 키캡키링 + 대형 팝콘 1개",
    resultImageUrl:
      "https://lwuqktbiyceddeqimgxt.supabase.co/storage/v1/object/public/lottery-assets/rank-2-image.png",
  },
  {
    rank: 3,
    ratio: 3.2,
    prize: "소형 팝콘 2개",
    resultImageUrl:
      "https://lwuqktbiyceddeqimgxt.supabase.co/storage/v1/object/public/lottery-assets/rank-3-image.png",
  },
  {
    rank: 4,
    ratio: 20,
    prize: "소형 팝콘 1개",
    resultImageUrl:
      "https://lwuqktbiyceddeqimgxt.supabase.co/storage/v1/object/public/lottery-assets/rank-4-image.png",
  },
  {
    rank: 5,
    ratio: 76,
    prize: "비트코인 초콜릿 2개",
    resultImageUrl:
      "https://lwuqktbiyceddeqimgxt.supabase.co/storage/v1/object/public/lottery-assets/rank-5-image.png",
  },
];

type Props = {
  onStart: (settings: LotterySettings) => void;
};

// PIN 확인이 필요한 동작: QR/굿즈/등수별 당첨 이미지 업로드, 뽑기 시작(설정 저장)
type PendingAction =
  | { type: "qr"; file: File }
  | { type: "prize"; file: File }
  | { type: "rank"; rank: number; file: File }
  | { type: "start" }
  | null;

export default function SettingsForm({ onStart }: Props) {
  const [participantCount, setParticipantCount] = useState(DEFAULT_PARTICIPANT_COUNT);
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [prizeImageUrl, setPrizeImageUrl] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [guideText, setGuideText] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 마운트 시 Supabase에 저장된 공유 설정을 불러온다. 어느 기기에서 열어도 같은 값이 보여야 한다.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (cancelled) return;

        if (data.settings) {
          setParticipantCount(data.settings.participantCount);
          // 예전에 저장된 데이터는 resultImageUrl이 없을 수 있어 null로 채워준다.
          setTiers(
            data.settings.tiers.map((tier: Tier) => ({
              ...tier,
              resultImageUrl: tier.resultImageUrl ?? null,
            })),
          );
          setQrCodeUrl(data.settings.qrCodeUrl);
          setPrizeImageUrl(data.settings.prizeImageUrl);
          setEventTitle(data.settings.eventTitle);
          setGuideText(data.settings.guideText);
        }
      } catch {
        if (!cancelled) {
          setLoadError("저장된 설정을 불러오지 못했습니다. 기본값으로 시작합니다.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const settings: LotterySettings = {
    participantCount,
    tiers,
    qrCodeUrl,
    prizeImageUrl,
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

  function updateResultImage(rank: number, resultImageUrl: string) {
    setTiers((prev) =>
      prev.map((tier) => (tier.rank === rank ? { ...tier, resultImageUrl } : tier)),
    );
  }

  function addTier() {
    if (tiers.length >= MAX_TIERS) return;
    const nextRank = tiers.length + 1;
    setTiers((prev) => [
      ...prev,
      { rank: nextRank, ratio: 5, prize: "", resultImageUrl: null },
    ]);
  }

  function removeTier(rank: number) {
    setTiers((prev) =>
      prev
        .filter((tier) => tier.rank !== rank)
        // 등수를 삭제하면 뒤 등수를 앞으로 당겨서 항상 1등부터 연속되게 유지한다.
        .map((tier, index) => ({ ...tier, rank: index + 1 })),
    );
  }

  function handleQrFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 선택해도 onChange가 발생하도록 초기화
    if (!file) return;
    setActionError(null);
    setPendingAction({ type: "qr", file });
  }

  function handlePrizeFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setActionError(null);
    setPendingAction({ type: "prize", file });
  }

  function handleRankFileSelected(rank: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setActionError(null);
    setPendingAction({ type: "rank", rank, file });
  }

  function handleStartClick() {
    if (!valid) return;
    setActionError(null);
    setPendingAction({ type: "start" });
  }

  // PIN 입력 후 실제 업로드/저장을 수행한다. 정오답 판단은 서버 API가 담당한다.
  async function handlePinSubmit(pin: string) {
    if (!pendingAction) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      if (pendingAction.type === "start") {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, settings }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");
        setPendingAction(null);
        onStart(settings);
        return;
      }

      const body = new FormData();
      body.append("pin", pin);
      body.append(
        "type",
        pendingAction.type === "rank" ? `rank-${pendingAction.rank}` : pendingAction.type,
      );
      body.append("file", pendingAction.file);
      const res = await fetch("/api/upload-image", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드에 실패했습니다.");

      if (pendingAction.type === "qr") {
        setQrCodeUrl(data.url);
      } else if (pendingAction.type === "prize") {
        setPrizeImageUrl(data.url);
      } else {
        updateResultImage(pendingAction.rank, data.url);
      }
      setPendingAction(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 중 문제가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-10">
        <p className="text-slate-400">설정을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            디지털 종이뽑기 설정
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            참여자 수와 등수별 당첨 비율을 설정한 뒤 뽑기를 시작하세요.
          </p>
          {loadError && (
            <p className="mt-1 text-sm text-red-400">{loadError}</p>
          )}
        </div>
        <a
          href="/manual"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full border border-orange-400 px-4 py-2 text-sm font-medium text-orange-300"
        >
          📋 매뉴얼
        </a>
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
          SNS 구독·팔로우 안내용 QR 이미지를 올리면 뽑기판 화면에 노출됩니다. 업로드는 관리자
          비밀번호로 보호됩니다.
        </p>
        <div className="flex items-center gap-4">
          {qrCodeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage의 외부 URL이라 next/image 최적화 대상이 아니다
            <img
              src={qrCodeUrl}
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
              {qrCodeUrl ? "다른 이미지로 변경" : "이미지 업로드"}
              <input
                type="file"
                accept="image/*"
                onChange={handleQrFileSelected}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-5">
        <label className="text-lg font-semibold text-white">굿즈 이미지 (선택)</label>
        <p className="text-sm text-slate-400">
          등수별 굿즈 목록 옆에 노출되는 실물 이미지입니다. 업로드하지 않으면 기본 이미지가
          사용됩니다. 업로드는 관리자 비밀번호로 보호됩니다.
        </p>
        <div className="flex items-center gap-4">
          {prizeImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage의 외부 URL이라 next/image 최적화 대상이 아니다
            <img
              src={prizeImageUrl}
              alt="업로드된 굿즈 이미지"
              className="h-24 w-24 rounded-lg border border-orange-500/30 bg-white object-contain p-1"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- 작은 미리보기 썸네일이라 next/image 없이 표시한다
            <img
              src="/prize-goods.png"
              alt="기본 굿즈 이미지"
              className="h-24 w-24 rounded-lg border border-orange-500/30 bg-white object-contain p-1"
            />
          )}
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer rounded-full border border-orange-400 px-4 py-2 text-center text-sm font-medium text-orange-300">
              {prizeImageUrl ? "다른 이미지로 변경" : "이미지 업로드"}
              <input
                type="file"
                accept="image/*"
                onChange={handlePrizeFileSelected}
                className="hidden"
              />
            </label>
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
        <p className="text-sm text-slate-400">
          당첨 이미지를 등록하면 참여자가 뽑았을 때 뜨는 결과 팝업에 등수 문구 대신 해당 이미지가
          표시됩니다. (다시 업로드하면 이전 이미지를 덮어씁니다)
        </p>

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
              <div className="flex items-center gap-3">
                {tier.resultImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage의 외부 URL이라 next/image 최적화 대상이 아니다
                  <img
                    src={tier.resultImageUrl}
                    alt={`${rankLabel(tier.rank)} 당첨 이미지`}
                    className="h-12 w-12 rounded-lg border border-orange-500/30 bg-white object-contain p-0.5"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-600 text-[10px] text-slate-500">
                    없음
                  </div>
                )}
                <label className="cursor-pointer rounded-full border border-orange-400/60 px-3 py-1 text-xs font-medium text-orange-300">
                  {tier.resultImageUrl ? "당첨 이미지 변경" : "당첨 이미지 업로드"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleRankFileSelected(tier.rank, e)}
                    className="hidden"
                  />
                </label>
              </div>
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
      </section>

      <button
        type="button"
        onClick={handleStartClick}
        disabled={!valid}
        className="mt-4 rounded-full border border-orange-300/50 bg-orange-500 py-4 text-lg font-bold text-white shadow-[0_0_25px_rgba(249,115,22,0.45)] transition-shadow active:shadow-[0_0_10px_rgba(249,115,22,0.3)] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
      >
        뽑기 시작하기
      </button>

      {pendingAction && (
        <PinModal
          onSubmit={handlePinSubmit}
          onCancel={() => {
            setPendingAction(null);
            setActionError(null);
          }}
          error={actionError}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
