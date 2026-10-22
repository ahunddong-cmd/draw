import Link from "next/link";

// OX 퀴즈는 아직 기획/구현 전이라, /games에서 연결만 해두고 준비 중 안내만 보여준다.
export default function OxQuizPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-white">OX 퀴즈 준비 중입니다</h1>
      <p className="text-sm text-slate-400">곧 만나보실 수 있어요.</p>
      <Link
        href="/games"
        className="mt-2 rounded-full border border-orange-400 px-5 py-2 text-sm font-medium text-orange-300"
      >
        게임 선택으로 돌아가기
      </Link>
    </div>
  );
}
