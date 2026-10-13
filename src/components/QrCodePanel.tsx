type Props = {
  src: string | null;
};

export default function QrCodePanel({ src }: Props) {
  if (!src) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-[286px] items-center justify-center rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- 업로드된 QR은 data URL이라 next/image 최적화 대상이 아니다 */}
      <img
        src={src}
        alt="SNS 구독·팔로우 QR 코드"
        className="aspect-square w-full object-contain"
      />
    </div>
  );
}
