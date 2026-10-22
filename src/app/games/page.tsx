"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EventHeader from "@/components/EventHeader";

// 게임 목록. 추후 다른 게임이 추가되면 여기에 항목만 더하면 된다.
const GAMES = [
  {
    href: "/",
    title: "디지털 종이뽑기",
    description: "참여자가 번호를 뽑아 당첨 등수를 확인하는 이벤트",
  },
  {
    href: "/ox-quiz",
    title: "OX 퀴즈",
    description: "문제를 보고 O 또는 X로 정답을 맞히는 이벤트",
  },
];

export default function GamesPage() {
  const [eventTitle, setEventTitle] = useState<string | undefined>(undefined);

  // 행사 문구는 종이뽑기 설정에 저장돼 있는 값을 그대로 가져와 상단 브랜딩을 통일한다.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.settings?.eventTitle) {
          setEventTitle(data.settings.eventTitle);
        }
      })
      .catch(() => {
        // 못 불러와도 로고만 보이는 기본 헤더로 충분하므로 조용히 넘어간다.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <EventHeader eventTitle={eventTitle} />

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-8 px-6 py-10">
        <h1 className="text-2xl font-bold text-white">진행할 게임을 선택해주세요</h1>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          {GAMES.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 px-8 py-12 text-center transition-colors hover:border-orange-400 hover:bg-[#1f140a]"
            >
              <span className="text-xl font-bold text-white">{game.title}</span>
              <span className="text-sm text-slate-400">{game.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
