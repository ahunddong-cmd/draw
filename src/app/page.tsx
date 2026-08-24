"use client";

import { useState } from "react";
import SettingsForm from "@/components/SettingsForm";
import LotteryBoard from "@/components/LotteryBoard";
import EventHeader from "@/components/EventHeader";
import { generateBoard, type BoardCell, type LotterySettings } from "@/lib/lottery";

export default function Home() {
  const [settings, setSettings] = useState<LotterySettings | null>(null);
  const [board, setBoard] = useState<BoardCell[] | null>(null);

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

  return (
    <div className="flex flex-1 flex-col">
      <EventHeader eventTitle={settings?.eventTitle} />
      {board && settings ? (
        <LotteryBoard
          board={board}
          tiers={settings.tiers}
          qrCodeDataUrl={settings.qrCodeDataUrl}
          prizeImageDataUrl={settings.prizeImageDataUrl}
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
