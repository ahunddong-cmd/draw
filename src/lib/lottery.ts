export const MIN_PARTICIPANTS = 50;
export const MAX_PARTICIPANTS = 500;
export const MAX_TIERS = 5;

export type Tier = {
  rank: number; // 1~5등
  ratio: number; // 당첨 비율 (%), 0~100
  prize: string; // 등수별 지급 굿즈 (예: "대형방석 + 대형 팝콘 2개")
  resultImageUrl: string | null; // 당첨 결과 팝업에 보여줄 등수별 이미지 URL (Supabase Storage)
};

export type LotterySettings = {
  participantCount: number;
  tiers: Tier[];
  qrCodeUrl: string | null; // SNS 구독·팔로우 안내용 QR 이미지 URL (Supabase Storage)
  prizeImageUrl: string | null; // 뽑기 굿즈 실물 이미지 URL (비워두면 기본 이미지 사용)
  eventTitle: string; // 로고 아래에 노출할 행사 문구 (예: "X 연세대학교 가을 축제")
  guideText: string; // 뽑기판 굿즈 목록 위에 노출할 이벤트 참여 안내 문구
};

export type BoardCell = {
  id: number;
  rank: number | null; // null이면 꽝
  revealed: boolean;
};

export function rankLabel(rank: number): string {
  return `${rank}등`;
}

export function totalRatio(tiers: Tier[]): number {
  return tiers.reduce((sum, tier) => sum + tier.ratio, 0);
}

// 비율(%)을 실제 당첨 개수로 환산. 소수점은 버림 처리해 참여자 수를 넘지 않게 한다.
export function tierWinCount(participantCount: number, ratio: number): number {
  return Math.floor((participantCount * ratio) / 100);
}

export function isSettingsValid(settings: LotterySettings): boolean {
  const { participantCount, tiers } = settings;
  if (participantCount < MIN_PARTICIPANTS || participantCount > MAX_PARTICIPANTS) {
    return false;
  }
  if (tiers.length === 0 || tiers.length > MAX_TIERS) {
    return false;
  }
  if (totalRatio(tiers) > 100) {
    return false;
  }
  return tiers.every((tier) => tier.ratio > 0);
}

// Fisher-Yates 셔플로 배열을 무작위로 섞는다.
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 설정값을 바탕으로 등수가 무작위 배치된 뽑기판을 생성한다.
export function generateBoard(settings: LotterySettings): BoardCell[] {
  const ranks: (number | null)[] = [];

  settings.tiers.forEach((tier) => {
    const count = tierWinCount(settings.participantCount, tier.ratio);
    for (let i = 0; i < count; i += 1) {
      ranks.push(tier.rank);
    }
  });

  while (ranks.length < settings.participantCount) {
    ranks.push(null); // 나머지는 꽝
  }

  return shuffle(ranks).map((rank, index) => ({
    id: index,
    rank,
    revealed: false,
  }));
}
