import type { Metadata } from "next";
import StaffManual from "@/components/StaffManual";

export const metadata: Metadata = {
  title: "운영 스탭 사용 매뉴얼",
};

export default function ManualPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-white">
        디지털 종이뽑기 운영 스탭 사용 매뉴얼
      </h1>
      <StaffManual />
    </div>
  );
}
