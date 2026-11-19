import Image from "next/image";

type Props = {
  eventTitle?: string;
};

export default function EventHeader({ eventTitle }: Props) {
  return (
    // 뽑기판에서 칸을 고르려고 화면을 아래로 스크롤해도 로고·행사명 박스는 항상
    // 보이도록 뷰포트 상단에 고정한다. 배경은 body의 고정 그라데이션 위에 깔리는
    // 반투명 바라서, 뒤로 넘어가는 칸들이 비쳐 보이지 않게 가려준다.
    <div className="sticky top-0 z-30 w-full bg-[#120b05]/95 pt-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-orange-500/20 bg-white px-6 py-5">
          <Image
            src="/bithumb-logo.png"
            alt="빗썸 로고"
            width={481}
            height={211}
            priority
            className="h-10 w-auto"
          />
          {eventTitle && (
            <span className="text-[32.5px] font-bold text-orange-500">{eventTitle}</span>
          )}
        </div>
      </div>
    </div>
  );
}
