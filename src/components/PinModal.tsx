"use client";

import { useState, type FormEvent } from "react";

type Props = {
  // 정오답 판단은 호출부가 담당한다 (로컬 비교 또는 서버 응답 기반).
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  error?: string | null;
  isSubmitting?: boolean;
};

export default function PinModal({ onSubmit, onCancel, error, isSubmitting }: Props) {
  const [pin, setPin] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(pin);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={onCancel}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex w-72 flex-col gap-4 rounded-2xl border border-orange-500/30 bg-[#1f140a] p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold text-white">관리자 확인</h2>
        <p className="text-sm text-slate-400">관리자 비밀번호를 입력하세요.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="rounded-lg border border-orange-500/30 bg-[#120b05] px-3 py-2 text-lg tracking-widest text-white"
        />
        {error && (
          <p className="text-sm font-medium text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-slate-600 py-2 font-medium text-slate-200"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-full bg-orange-500 py-2 font-semibold text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] disabled:cursor-not-allowed disabled:bg-orange-500/50"
          >
            {isSubmitting ? "확인 중..." : "확인"}
          </button>
        </div>
      </form>
    </div>
  );
}
