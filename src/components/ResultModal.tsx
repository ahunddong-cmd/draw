"use client";

import { rankLabel } from "@/lib/lottery";
import Fireworks, { FIREWORK_COLORS } from "@/components/Fireworks";

type Props = {
  rank: number | null;
  prize?: string;
  imageUrl?: string | null;
  onClose: () => void;
};

const CARD_BURST_COUNT = 20;
const CARD_BURST_RADIUS = 90;

// 등수별 당첨 이미지 카드 너비(px). 1등이 가장 크고 5등이 기존 크기(320px)다.
// 원본 이미지 실제 해상도(약 460~480px)를 넘지 않게 잡아서 확대해도 깨지지 않는다.
const IMAGE_CARD_WIDTH: Record<number, number> = {
  1: 440,
  2: 410,
  3: 380,
  4: 350,
  5: 320,
};
const DEFAULT_IMAGE_CARD_WIDTH = 320;

// Math.random을 렌더링 중에 호출하면 React 순수성 규칙에 걸리므로,
// 모듈 로드 시점에 고정된 유사 난수 패턴으로 파티클 위치를 미리 계산해둔다.
// 화면 전체 폭죽(Fireworks)과 달리 등수와 무관하게 항상 동일한 규모로 고정한다.
const CARD_BURST_PARTICLES = Array.from({ length: CARD_BURST_COUNT }, (_, i) => {
  const jitter = ((i * 41) % 17) - 8; // -8 ~ 8도
  const angle = (360 / CARD_BURST_COUNT) * i + jitter;
  const rad = (angle * Math.PI) / 180;
  const distance = CARD_BURST_RADIUS * (0.7 + ((i * 13) % 30) / 100);
  return {
    id: i,
    tx: Math.cos(rad) * distance,
    ty: Math.sin(rad) * distance,
    color: FIREWORK_COLORS[i % FIREWORK_COLORS.length],
    delay: ((i * 7) % 12) / 100, // 0 ~ 0.11s
  };
});

function CardFireworkBurst() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span
        className="absolute left-1/2 top-1/2 rounded-full bg-white animate-[firework-flash_0.6s_ease-out_forwards]"
        style={{ width: 36, height: 36 }}
      />
      {CARD_BURST_PARTICLES.map((particle) => (
        <span
          key={particle.id}
          className="absolute left-1/2 top-1/2 rounded-full animate-[firework-particle_0.8s_ease-out_forwards]"
          style={
            {
              width: 6,
              height: 6,
              backgroundColor: particle.color,
              boxShadow: `0 0 6px ${particle.color}`,
              "--tx": `${particle.tx}px`,
              "--ty": `${particle.ty}px`,
              animationDelay: `${particle.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function ResultModal({ rank, prize, imageUrl, onClose }: Props) {
  const isWin = rank !== null;
  const showImage = isWin && Boolean(imageUrl);
  const imageCardWidth =
    isWin && rank !== null ? (IMAGE_CARD_WIDTH[rank] ?? DEFAULT_IMAGE_CARD_WIDTH) : DEFAULT_IMAGE_CARD_WIDTH;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      {isWin && <Fireworks rank={rank} />}
      <div
        onClick={(e) => e.stopPropagation()}
        style={showImage ? { width: `min(${imageCardWidth}px, 90vw)` } : undefined}
        className={
          "relative flex flex-col items-center gap-4 rounded-2xl text-center shadow-2xl animate-[card-flip-in_0.4s_ease-out] " +
          (showImage
            ? "bg-white p-4"
            : "w-64 p-8 " +
              (isWin
                ? "bg-orange-500 text-white"
                : "border border-slate-700 bg-[#1f140a] text-slate-300"))
        }
      >
        {isWin && <CardFireworkBurst />}
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage의 외부 URL이라 next/image 최적화 대상이 아니다
          <img
            src={imageUrl!}
            alt={`${rankLabel(rank!)} 당첨 - ${prize ?? ""}`}
            className="relative w-full rounded-xl object-contain"
          />
        ) : (
          <>
            <span className="relative text-5xl font-extrabold">
              {isWin ? rankLabel(rank) : "꽝"}
            </span>
            <span className="relative text-lg font-medium">
              {isWin ? "축하합니다!" : "다음 기회에"}
            </span>
            {isWin && prize && (
              <span className="relative text-base font-semibold text-black">{prize}</span>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          className={
            "relative mt-2 rounded-full px-6 py-2 font-semibold " +
            (showImage
              ? "bg-orange-500 text-white"
              : isWin
                ? "bg-black/10"
                : "bg-white/10 text-white")
          }
        >
          확인
        </button>
      </div>
    </div>
  );
}
