type Props = {
  src: string | null;
};

export default function QrCodePanel({ src }: Props) {
  if (!src) {
    return null;
  }

  return (
    <div className="flex w-40 shrink-0 flex-col items-center gap-2 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- 업로드된 QR은 data URL이라 next/image 최적화 대상이 아니다 */}
      <img
        src={src}
        alt="SNS 구독·팔로우 QR 코드"
        className="h-28 w-28 rounded-lg bg-white object-contain p-1"
      />
      <span className="text-xs font-medium text-slate-300">QR 스캔</span>
    </div>
  );
}
