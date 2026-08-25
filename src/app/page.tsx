"use client";

import { useEffect, useState } from "react";
import SettingsForm from "@/components/SettingsForm";
import LotteryBoard from "@/components/LotteryBoard";
import EventHeader from "@/components/EventHeader";
import { generateBoard, type BoardCell, type LotterySettings } from "@/lib/lottery";

// 새로고침해도 진행 중인 뽑기판이 그대로 보이도록 이 기기의 localStorage에만 저장한다.
// 여러 기기가 같은 뽑기판을 공유하는 게 아니라, 각 키오스크가 자기 진행 상황만 기억하면 된다.
const SESSION_STORAGE_KEY = "digital-lottery:session";

type Session = {
  settings: LotterySettings;
  board: BoardCell[];
};

export default function Home() {
  const [settings, setSettings] = useState<LotterySettings | null>(null);
  const [board, setBoard] = useState<BoardCell[] | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // 마운트 시 1회, 저장된 진행 중인 뽑기판이 있으면 복원한다.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Session;
        if (saved.settings && saved.board) {
          // localStorage는 마운트 후에만 읽을 수 있어 effect 안에서 최초 1회만 복원한다.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSettings(saved.settings);
          setBoard(saved.board);
        }
      }
    } catch {
      // 저장된 값이 손상되었으면 무시하고 설정 화면부터 새로 시작한다.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 진행 중인 뽑기판이 바뀔 때마다(뽑기 시작, 칸 공개) 저장하고, 초기화되면 지운다.
  useEffect(() => {
    if (!isHydrated) return; // 복원이 끝나기 전에는 빈 상태를 덮어쓰지 않는다.
    if (settings && board) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ settings, board }));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [settings, board, isHydrated]);

  function handleStart(newSettings: LotterySettings) {
    setSettings(newSettings);
    setBoard(generateBoard(newSettings));
  }

  function handleReveal(id: number) {
    setBoard((prev) =>
      prev
        ? prev.map((cell) => (cell.id === id ? { ...cell, revealed: true } : cell))
        : prev,
    );
  }

  function handleReset() {
    setBoard(null); // PIN 확인은 LotteryBoard에서 이미 통과한 뒤 호출된다.
  }

  if (!isHydrated) {
    return <div className="flex flex-1 flex-col" />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <EventHeader eventTitle={settings?.eventTitle} />
      {board && settings ? (
        <LotteryBoard
          board={board}
          tiers={settings.tiers}
          qrCodeUrl={settings.qrCodeUrl}
          prizeImageUrl={settings.prizeImageUrl}
          guideText={settings.guideText}
          onReveal={handleReveal}
          onReset={handleReset}
        />
      ) : (
        <SettingsForm onStart={handleStart} />
      )}
    </div>
  );
}
