"use client";

import { useEffect, useState } from "react";
import { pickRandomQuestion, type OxAnswer, type Question, type RewardTier } from "@/lib/ox-quiz";
import { SETTINGS_PIN } from "@/lib/auth";
import PinModal from "@/components/PinModal";

type Props = {
  questions: Question[];
  rewardEnabled: boolean;
  onReset: () => void;
};

type Phase = "idle" | "countdown" | "question" | "result";

// 참가 유도 문구 한 글자씩 적용할 무지개 순서 색상
const RAINBOW_COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#007aff", "#5856d6", "#af52de"];
const COUNTDOWN_START = 3;

export default function OxQuizPlay({ questions, rewardEnabled, onReset }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<OxAnswer | null>(null);
  // undefined: 경품 추첨을 하지 않음(미연결 또는 오답) / null: 추첨했지만 꽝 / RewardTier: 당첨
  const [rewardResult, setRewardResult] = useState<RewardTier | null | undefined>(undefined);
  const [isDrawing, setIsDrawing] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  function handleTapStart() {
    setCountdown(COUNTDOWN_START);
    setPhase("countdown");
  }

  // 카운트다운 화면: 1초마다 숫자를 하나씩 줄이고, 1을 다 보여준 뒤 문제를 뽑아 출제 화면으로 넘어간다.
  useEffect(() => {
    if (phase !== "countdown") return;

    const timer = setTimeout(() => {
      if (countdown <= 1) {
        setCurrentQuestion(pickRandomQuestion(questions));
        setSelectedAnswer(null);
        setRewardResult(undefined);
        setPhase("question");
      } else {
        setCountdown((c) => c - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, countdown, questions]);

  async function handleAnswer(answer: OxAnswer) {
    if (!currentQuestion) return;
    setSelectedAnswer(answer);
    const correct = answer === currentQuestion.correctAnswer;

    if (correct && rewardEnabled) {
      setIsDrawing(true);
      try {
        const res = await fetch("/api/ox-quiz/draw-reward", { method: "POST" });
        const data = await res.json();
        setRewardResult(res.ok ? (data.tier as RewardTier | null) : null);
      } catch {
        setRewardResult(null);
      } finally {
        setIsDrawing(false);
      }
    } else {
      setRewardResult(undefined);
    }

    setPhase("result");
  }

  function handleNext() {
    setPhase("idle");
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setRewardResult(undefined);
  }

  function handlePinSubmit(pin: string) {
    if (pin === SETTINGS_PIN) {
      setShowPinModal(false);
      setPinError(null);
      onReset();
    } else {
      setPinError("비밀번호가 올바르지 않습니다");
    }
  }

  const isCorrect = currentQuestion && selectedAnswer === currentQuestion.correctAnswer;

  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">OX 퀴즈</h1>
        <button
          type="button"
          onClick={() => setShowPinModal(true)}
          className="rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-orange-400 hover:text-orange-300"
        >
          처음부터 다시
        </button>
      </div>

      {phase === "idle" && (
        <button
          type="button"
          onClick={handleTapStart}
          className="mt-8 flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-orange-500/30 bg-[#1f140a]/60 py-20 text-center active:bg-[#1f140a]"
        >
          <span className="text-[72px] font-extrabold tracking-tight sm:text-[96px]">
            {"OX퀴즈 참여하기".split("").map((char, index) =>
              char === " " ? (
                <span key={index}> </span>
              ) : (
                <span key={index} style={{ color: RAINBOW_COLORS[index % RAINBOW_COLORS.length] }}>
                  {char}
                </span>
              ),
            )}
          </span>
          <span className="text-[48px] font-bold text-white">화면을 터치하세요</span>
          <span className="text-[28px] text-slate-400">문제가 출제됩니다</span>
        </button>
      )}

      {phase === "countdown" && (
        <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-orange-500/30 bg-[#1f140a]/60 py-20">
          <span className="text-[280px] font-extrabold leading-none text-orange-400 drop-shadow-[0_0_30px_rgba(249,115,22,0.6)]">
            {countdown}
          </span>
        </div>
      )}

      {phase === "question" && currentQuestion && (
        <div className="mt-8 flex flex-1 flex-col items-center gap-6">
          {currentQuestion.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage의 외부 URL이라 next/image 최적화 대상이 아니다
            <img
              src={currentQuestion.imageUrl}
              alt="문제 이미지"
              className="max-h-48 w-auto rounded-xl border border-orange-500/20 bg-white object-contain p-2"
            />
          )}
          <p className="rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-6 text-center text-xl font-semibold text-white">
            {currentQuestion.text}
          </p>
          <div className="grid w-full grid-cols-2 gap-4">
            {(["O", "X"] as OxAnswer[]).map((answer) => (
              <button
                key={answer}
                type="button"
                onClick={() => handleAnswer(answer)}
                disabled={isDrawing}
                className="rounded-2xl border border-orange-300/50 bg-orange-500 py-10 text-4xl font-extrabold text-white shadow-[0_0_25px_rgba(249,115,22,0.45)] active:shadow-[0_0_10px_rgba(249,115,22,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {answer}
              </button>
            ))}
          </div>
          {isDrawing && <p className="text-sm text-slate-400">경품 추첨 중...</p>}
        </div>
      )}

      {phase === "result" && currentQuestion && (
        <div className="mt-8 flex flex-1 flex-col items-center gap-5">
          <div
            className={
              "flex w-full flex-col items-center gap-2 rounded-2xl border p-8 text-center " +
              (isCorrect
                ? "border-orange-400/40 bg-orange-500/10"
                : "border-slate-700 bg-[#1f140a]/60")
            }
          >
            <span className={"text-3xl font-extrabold " + (isCorrect ? "text-orange-300" : "text-slate-300")}>
              {isCorrect ? "정답입니다!" : "오답입니다"}
            </span>
            <span className="text-sm text-slate-400">
              정답은 <span className="font-bold text-white">{currentQuestion.correctAnswer}</span>
              입니다
            </span>
            {currentQuestion.explanation && (
              <p className="mt-2 text-sm text-slate-300">{currentQuestion.explanation}</p>
            )}
          </div>

          {rewardEnabled && isCorrect && (
            <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-6 text-center">
              {rewardResult ? (
                <>
                  <span className="text-lg font-bold text-orange-300">경품 당첨!</span>
                  {rewardResult.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage의 외부 URL이라 next/image 최적화 대상이 아니다
                    <img
                      src={rewardResult.imageUrl}
                      alt={rewardResult.prize}
                      className="h-24 w-24 rounded-lg border border-orange-500/30 bg-white object-contain p-1"
                    />
                  )}
                  <span className="text-xl font-bold text-white">{rewardResult.prize}</span>
                </>
              ) : (
                <span className="text-lg font-semibold text-slate-300">다음 기회에!</span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="mt-2 w-full rounded-full border border-orange-300/50 bg-orange-500 py-4 text-lg font-bold text-white shadow-[0_0_25px_rgba(249,115,22,0.45)] active:shadow-[0_0_10px_rgba(249,115,22,0.3)]"
          >
            다음 참가자
          </button>
        </div>
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
  );
}
