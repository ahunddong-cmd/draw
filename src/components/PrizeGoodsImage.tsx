type Props = {
  src?: string | null;
};

export default function PrizeGoodsImage({ src }: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- 등수 박스와 세로 높이를 맞추기 위해 h-full/object-contain로 그려야 해서 next/image 대신 일반 img를 쓴다 */}
      <img
        src={src || "/prize-goods.png"}
        alt="뽑기 굿즈 실물 이미지"
        className="h-full w-full object-contain"
      />
    </div>
  );
}
