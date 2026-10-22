"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MAX_QUESTIONS,
  MAX_REWARD_TIERS,
  generateLocalId,
  isOxQuizSettingsValid,
  type OxAnswer,
  type OxQuizSettings,
  type Question,
  type RewardTier,
} from "@/lib/ox-quiz";
import PinModal from "@/components/PinModal";

type Props = {
  onStart: (settings: OxQuizSettings) => void;
};

// PIN 확인이 필요한 동작: 문제/경품 이미지 업로드, 퀴즈 시작(설정 저장)
type PendingAction =
  | { type: "question"; id: string; file: File }
  | { type: "prize"; id: string; file: File }
  | { type: "start" }
  | null;

export default function OxQuizSettingsForm({ onStart }: Props) {
  const [eventTitle, setEventTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rewardEnabled, setRewardEnabled] = useState(false);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);

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
        const res = await fetch("/api/ox-quiz/settings");
        const data = await res.json();
        if (cancelled) return;

        if (data.settings) {
          setEventTitle(data.settings.eventTitle ?? "");
          setQuestions(data.settings.questions ?? []);
          setRewardEnabled(data.settings.rewardEnabled ?? false);
          setRewardTiers(data.settings.rewardTiers ?? []);
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

  const settings: OxQuizSettings = { eventTitle, questions, rewardEnabled, rewardTiers };
  const valid = isOxQuizSettingsValid(settings);
  const rewardRatioSum = rewardTiers.reduce((sum, t) => sum + t.ratio, 0);

  function addQuestion() {
    if (questions.length >= MAX_QUESTIONS) return;
    setQuestions((prev) => [
      ...prev,
      { id: generateLocalId(), text: "", correctAnswer: "O", explanation: "", imageUrl: null },
    ]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion<K extends keyof Question>(id: string, key: K, value: Question[K]) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [key]: value } : q)));
  }

  function addRewardTier() {
    if (rewardTiers.length >= MAX_REWARD_TIERS) return;
    setRewardTiers((prev) => [
      ...prev,
      { id: generateLocalId(), prize: "", ratio: 5, remaining: 10, imageUrl: null },
    ]);
  }

  function removeRewardTier(id: string) {
    setRewardTiers((prev) => prev.filter((t) => t.id !== id));
  }

  function updateRewardTier<K extends keyof RewardTier>(
    id: string,
    key: K,
    value: RewardTier[K],
  ) {
    setRewardTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [key]: value } : t)));
  }

  function handleQuestionFileSelected(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setActionError(null);
    setPendingAction({ type: "question", id, file });
  }

  function handlePrizeFileSelected(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setActionError(null);
    setPendingAction({ type: "prize", id, file });
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
        const res = await fetch("/api/ox-quiz/settings", {
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
      body.append("type", `${pendingAction.type}-${pendingAction.id}`);
      body.append("file", pendingAction.file);
      const res = await fetch("/api/ox-quiz/upload-image", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드에 실패했습니다.");

      if (pendingAction.type === "question") {
        updateQuestion(pendingAction.id, "imageUrl", data.url);
      } else {
        updateRewardTier(pendingAction.id, "imageUrl", data.url);
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
      <Link
        href="/games"
        className="self-start rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-orange-400 hover:text-orange-300"
      >
        🏠 홈
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">OX 퀴즈 설정</h1>
        <p className="mt-1 text-sm text-slate-400">
          문제를 등록하고, 필요하면 정답 시 경품 뽑기와 연결하세요.
        </p>
        {loadError && <p className="mt-1 text-sm text-red-400">{loadError}</p>}
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
            <span className="text-[32.5px] font-bold text-orange-500">{eventTitle}</span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-lg font-semibold text-white">문제 은행</label>
          <button
            type="button"
            onClick={addQuestion}
            disabled={questions.length >= MAX_QUESTIONS}
            className="rounded-full border border-orange-400 px-3 py-1.5 text-sm font-medium text-orange-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600"
          >
            + 문제 추가
          </button>
        </div>
        <p className="text-sm text-slate-400">
          참가자가 화면을 터치할 때마다 이 중 한 문제가 무작위로 출제됩니다.
        </p>

        <div className="flex flex-col gap-2">
          {questions.map((q, index) => (
            <div
              key={q.id}
              className="flex flex-col gap-2 rounded-xl border border-orange-500/20 bg-[#1f140a]/60 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 font-semibold text-white">문제 {index + 1}</span>
                <div className="ml-auto flex gap-1">
                  {(["O", "X"] as OxAnswer[]).map((answer) => (
                    <button
                      key={answer}
                      type="button"
                      onClick={() => updateQuestion(q.id, "correctAnswer", answer)}
                      className={
                        "h-8 w-8 rounded-lg text-sm font-bold " +
                        (q.correctAnswer === answer
                          ? "bg-orange-500 text-white"
                          : "border border-slate-600 text-slate-400")
                      }
                    >
                      {answer}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:text-red-400"
                  aria-label={`문제 ${index + 1} 삭제`}
                >
                  ✕
                </button>
              </div>
              <textarea
                value={q.text}
                onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                placeholder="예: 비트코인의 창시자는 사토시 나카모토이다."
                rows={2}
                className="w-full resize-none rounded-lg border border-orange-500/20 bg-[#120b05] px-3 py-1.5 text-sm text-white placeholder:text-slate-600"
              />
              <input
                type="text"
                value={q.explanation}
                onChange={(e) => updateQuestion(q.id, "explanation", e.target.value)}
                placeholder="해설 (선택, 정답 공개 시 함께 표시됩니다)"
                className="w-full rounded-lg border border-orange-500/20 bg-[#120b05] px-3 py-1.5 text-sm text-white placeholder:text-slate-600"
              />
              <div className="flex items-center gap-3">
                {q.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage의 외부 URL이라 next/image 최적화 대상이 아니다
                  <img
                    src={q.imageUrl}
                    alt={`문제 ${index + 1} 이미지`}
                    className="h-12 w-12 rounded-lg border border-orange-500/30 bg-white object-contain p-0.5"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-600 text-[10px] text-slate-500">
                    없음
                  </div>
                )}
                <label className="cursor-pointer rounded-full border border-orange-400/60 px-3 py-1 text-xs font-medium text-orange-300">
                  {q.imageUrl ? "이미지 변경" : "이미지 업로드 (선택)"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleQuestionFileSelected(q.id, e)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ))}
          {questions.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
              아직 등록된 문제가 없습니다. &ldquo;+ 문제 추가&rdquo;로 시작하세요.
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-5">
        <label className="flex items-center gap-2 text-lg font-semibold text-white">
          <input
            type="checkbox"
            checked={rewardEnabled}
            onChange={(e) => setRewardEnabled(e.target.checked)}
            className="h-4 w-4 accent-orange-400"
          />
          정답 시 경품 뽑기와 연결
        </label>
        <p className="text-sm text-slate-400">
          기본은 정답/오답만 보여줍니다. 체크하면 정답을 맞혔을 때 아래 확률대로 경품을
          추첨해서 함께 보여줍니다.
        </p>

        {rewardEnabled && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">경품 목록</span>
              <button
                type="button"
                onClick={addRewardTier}
                disabled={rewardTiers.length >= MAX_REWARD_TIERS}
                className="rounded-full border border-orange-400 px-3 py-1.5 text-sm font-medium text-orange-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600"
              >
                + 경품 추가
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {rewardTiers.map((tier, index) => (
                <div
                  key={tier.id}
                  className="flex flex-col gap-2 rounded-xl border border-orange-500/20 bg-[#120b05] p-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tier.prize}
                      onChange={(e) => updateRewardTier(tier.id, "prize", e.target.value)}
                      placeholder="경품명"
                      aria-label={`경품 ${index + 1} 이름`}
                      className="min-w-0 flex-1 rounded-lg border border-orange-500/20 bg-[#1f140a] px-3 py-1.5 text-sm text-white placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeRewardTier(tier.id)}
                      className="rounded-lg px-2 py-1 text-slate-500 hover:text-red-400"
                      aria-label={`경품 ${index + 1} 삭제`}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <label className="flex items-center gap-1 text-slate-400">
                      확률
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={tier.ratio}
                        onChange={(e) =>
                          updateRewardTier(tier.id, "ratio", Number(e.target.value))
                        }
                        className="w-16 rounded-lg border border-orange-500/20 bg-[#1f140a] px-2 py-1 text-right text-white"
                      />
                      %
                    </label>
                    <label className="flex items-center gap-1 text-slate-400">
                      수량
                      <input
                        type="number"
                        min={0}
                        value={tier.remaining}
                        onChange={(e) =>
                          updateRewardTier(tier.id, "remaining", Number(e.target.value))
                        }
                        className="w-16 rounded-lg border border-orange-500/20 bg-[#1f140a] px-2 py-1 text-right text-white"
                      />
                      개
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    {tier.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage의 외부 URL이라 next/image 최적화 대상이 아니다
                      <img
                        src={tier.imageUrl}
                        alt={`${tier.prize || "경품"} 이미지`}
                        className="h-12 w-12 rounded-lg border border-orange-500/30 bg-white object-contain p-0.5"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-600 text-[10px] text-slate-500">
                        없음
                      </div>
                    )}
                    <label className="cursor-pointer rounded-full border border-orange-400/60 px-3 py-1 text-xs font-medium text-orange-300">
                      {tier.imageUrl ? "이미지 변경" : "이미지 업로드 (선택)"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePrizeFileSelected(tier.id, e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <p
              className={
                rewardRatioSum > 100
                  ? "text-sm font-medium text-red-400"
                  : "text-sm text-slate-400"
              }
            >
              확률 합계 {rewardRatioSum}%{" "}
              {rewardRatioSum < 100 && `(나머지 ${100 - rewardRatioSum}%는 경품 없이 정답만 인정)`}
              {rewardRatioSum > 100 && " — 100%를 넘을 수 없습니다"}
            </p>
          </>
        )}
      </section>

      <button
        type="button"
        onClick={handleStartClick}
        disabled={!valid}
        className="mt-4 rounded-full border border-orange-300/50 bg-orange-500 py-4 text-lg font-bold text-white shadow-[0_0_25px_rgba(249,115,22,0.45)] transition-shadow active:shadow-[0_0_10px_rgba(249,115,22,0.3)] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
      >
        퀴즈 시작하기
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
