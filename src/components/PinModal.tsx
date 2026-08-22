"use client";

import { useState, type FormEvent } from "react";

type Props = {
  correctPin: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function PinModal({ correctPin, onSuccess, onCancel }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin === correctPin) {
      onSuccess();
    } else {
      setError(true);
      setPin("");
    }
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
        <h2 className="text-lg font-bold text-white">설정 화면으로 이동</h2>
        <p className="text-sm text-slate-400">관리자 비밀번호를 입력하세요.</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          className="rounded-lg border border-orange-500/30 bg-[#120b05] px-3 py-2 text-lg tracking-widest text-white"
        />
        {error && (
          <p className="text-sm font-medium text-red-400">
            비밀번호가 올바르지 않습니다
          </p>
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
            className="flex-1 rounded-full bg-orange-500 py-2 font-semibold text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]"
          >
            확인
          </button>
        </div>
      </form>
    </div>
  );
}
