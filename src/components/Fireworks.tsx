type Props = {
  rank: number;
};

type Particle = {
  tx: number;
  ty: number;
  color: string;
  delay: number;
};

type Burst = {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  particles: Particle[];
};

export const FIREWORK_COLORS = [
  "#fbbf24",
  "#f87171",
  "#60a5fa",
  "#4ade80",
  "#f472b6",
  "#facc15",
];

// 등수가 높을수록(1등에 가까울수록) 폭죽 개수·입자 수·퍼지는 반경이 커진다.
const RANK_CONFIG: Record<
  number,
  { burstCount: number; particleCount: number; radius: number; particleSize: number }
> = {
  1: { burstCount: 7, particleCount: 26, radius: 130, particleSize: 7 },
  2: { burstCount: 6, particleCount: 20, radius: 110, particleSize: 6 },
  3: { burstCount: 5, particleCount: 16, radius: 90, particleSize: 5 },
  4: { burstCount: 4, particleCount: 12, radius: 70, particleSize: 5 },
  5: { burstCount: 3, particleCount: 9, radius: 55, particleSize: 4 },
};

// Math.random을 렌더링 중에 호출하면 React 순수성 규칙에 걸리므로,
// 등수 + 인덱스로 결정되는 고정된 유사 난수 패턴으로 폭죽 위치·입자를 미리 계산해둔다.
function buildBursts(rank: number): Burst[] {
  const config = RANK_CONFIG[rank] ?? RANK_CONFIG[5];

  return Array.from({ length: config.burstCount }, (_, burstIndex) => {
    const left = 15 + ((rank * 37 + burstIndex * 61) % 70); // 15~85%
    const top = 10 + ((rank * 53 + burstIndex * 43) % 55); // 10~65%

    const particles = Array.from({ length: config.particleCount }, (_, i) => {
      const jitter = ((burstIndex * 17 + i * 11) % 20) - 10;
      const angle = (360 / config.particleCount) * i + jitter;
      const rad = (angle * Math.PI) / 180;
      const distance = config.radius * (0.7 + (((burstIndex + i) * 13) % 30) / 100);
      return {
        tx: Math.cos(rad) * distance,
        ty: Math.sin(rad) * distance,
        color: FIREWORK_COLORS[(burstIndex + i) % FIREWORK_COLORS.length],
        delay: ((i * 7) % 12) / 100,
      };
    });

    return {
      id: burstIndex,
      left,
      top,
      size: config.particleSize,
      delay: ((burstIndex * 15) % 60) / 100, // 폭죽마다 0~0.6초 시차를 둔다
      particles,
    };
  });
}

const FIREWORKS_BY_RANK: Record<number, Burst[]> = {
  1: buildBursts(1),
  2: buildBursts(2),
  3: buildBursts(3),
  4: buildBursts(4),
  5: buildBursts(5),
};

export default function Fireworks({ rank }: Props) {
  const bursts = FIREWORKS_BY_RANK[rank] ?? FIREWORKS_BY_RANK[5];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="absolute"
          style={{ left: `${burst.left}%`, top: `${burst.top}%` }}
        >
          <span
            className="absolute rounded-full bg-white animate-[firework-flash_0.6s_ease-out_forwards]"
            style={{
              width: burst.size * 6,
              height: burst.size * 6,
              animationDelay: `${burst.delay}s`,
            }}
          />
          {burst.particles.map((particle, i) => (
            <span
              key={i}
              className="absolute rounded-full animate-[firework-particle_0.9s_ease-out_forwards]"
              style={
                {
                  width: burst.size,
                  height: burst.size,
                  backgroundColor: particle.color,
                  boxShadow: `0 0 6px ${particle.color}`,
                  "--tx": `${particle.tx}px`,
                  "--ty": `${particle.ty}px`,
                  animationDelay: `${burst.delay + particle.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
