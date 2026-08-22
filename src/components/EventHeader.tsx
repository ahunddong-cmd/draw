import Image from "next/image";

type Props = {
  eventTitle?: string;
};

export default function EventHeader({ eventTitle }: Props) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-8">
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
          <span className="text-[25px] font-bold text-zinc-800">{eventTitle}</span>
        )}
      </div>
    </div>
  );
}
