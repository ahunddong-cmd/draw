export const MAX_QUESTIONS = 50;
export const MAX_REWARD_TIERS = 10;

export type OxAnswer = "O" | "X";

export type Question = {
  id: string;
  text: string; // 문제 문구
  correctAnswer: OxAnswer;
  explanation: string; // 정답 공개 시 보여줄 해설 (선택, 비워두면 안 보임)
  imageUrl: string | null;
};

export type RewardTier = {
  id: string;
  prize: string; // 경품명
  ratio: number; // 정답 시 이 경품이 나올 확률 (%), 0~100
  remaining: number; // 남은 수량. 0이 되면 더 이상 당첨되지 않는다.
  imageUrl: string | null;
};

export type OxQuizSettings = {
  eventTitle: string; // 로고 아래에 노출할 행사 문구 (예: "X 연세대학교 가을 축제")
  questions: Question[];
  rewardEnabled: boolean; // 정답 시 경품 뽑기로 연결할지 여부 (기본값 false)
  rewardTiers: RewardTier[];
};

export function isOxQuizSettingsValid(settings: OxQuizSettings): boolean {
  if (settings.questions.length === 0) return false;
  if (settings.questions.some((q) => q.text.trim() === "")) return false;

  if (settings.rewardEnabled) {
    if (settings.rewardTiers.length === 0) return false;
    if (settings.rewardTiers.some((t) => t.prize.trim() === "")) return false;
    const ratioSum = settings.rewardTiers.reduce((sum, t) => sum + t.ratio, 0);
    if (ratioSum > 100) return false;
  }

  return true;
}

// 문제 은행에서 무작위로 한 문제를 뽑는다. excludeId를 주면 같은 문제가 연속으로
// 나오지 않도록 그 문제를 제외하고 뽑는다(문제가 1개뿐이면 제외하지 않는다).
export function pickRandomQuestion(questions: Question[], excludeId?: string | null): Question | null {
  if (questions.length === 0) return null;
  const pool =
    excludeId && questions.length > 1 ? questions.filter((q) => q.id !== excludeId) : questions;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

// 간단한 고유 id 생성기. DB PK가 아니라 업로드 이미지 경로·목록 key 용도라 충돌만 피하면 된다.
export function generateLocalId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
