import Image from "next/image";

type Props = {
  src?: string | null;
};

export default function PrizeGoodsImage({ src }: Props) {
  return (
    <div className="flex w-full items-center justify-center rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-3">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- 업로드된 굿즈 이미지는 data URL이라 next/image 최적화 대상이 아니다
        <img src={src} alt="뽑기 굿즈 실물 이미지" className="h-auto w-full" />
      ) : (
        <Image
          src="/prize-goods.png"
          alt="뽑기 굿즈 실물 이미지"
          width={583}
          height={427}
          className="h-auto w-full"
        />
      )}
    </div>
  );
}
