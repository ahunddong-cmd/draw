"use client";

import { useEffect, useState } from "react";
import OxQuizSettingsForm from "@/components/OxQuizSettingsForm";
import OxQuizPlay from "@/components/OxQuizPlay";
import EventHeader from "@/components/EventHeader";
import type { OxQuizSettings } from "@/lib/ox-quiz";

// 종이뽑기 세션과 키가 겹치지 않도록 OX 퀴즈만의 로컬 저장 키를 따로 쓴다.
const SESSION_STORAGE_KEY = "ox-quiz:session";

export default function OxQuizPage() {
  const [settings, setSettings] = useState<OxQuizSettings | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // 마운트 시 1회, 진행 중이던 상태(설정 완료 여부)를 복원한다.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { settings: OxQuizSettings; isPlaying: boolean };
        if (saved.settings) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSettings(saved.settings);
          setIsPlaying(saved.isPlaying);
        }
      }
    } catch {
      // 저장된 값이 손상되었으면 무시하고 설정 화면부터 새로 시작한다.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (settings) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ settings, isPlaying }));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [settings, isPlaying, isHydrated]);

  function handleStart(newSettings: OxQuizSettings) {
    setSettings(newSettings);
    setIsPlaying(true);
  }

  function handleReset() {
    setIsPlaying(false); // PIN 확인은 OxQuizPlay에서 이미 통과한 뒤 호출된다.
  }

  if (!isHydrated) {
    return <div className="flex flex-1 flex-col" />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <EventHeader eventTitle={settings?.eventTitle} />
      {isPlaying && settings ? (
        <OxQuizPlay
          questions={settings.questions}
          rewardEnabled={settings.rewardEnabled}
          onReset={handleReset}
          onSettingsRefresh={setSettings}
        />
      ) : (
        <OxQuizSettingsForm onStart={handleStart} />
      )}
    </div>
  );
}
