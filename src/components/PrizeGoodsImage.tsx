import Image from "next/image";

export default function PrizeGoodsImage() {
  return (
    <div className="flex w-full items-center justify-center rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-3">
      <Image
        src="/prize-goods.png"
        alt="뽑기 굿즈 실물 이미지"
        width={583}
        height={427}
        className="h-auto w-full"
      />
    </div>
  );
}
