import { rankLabel, type Tier } from "@/lib/lottery";

type Props = {
  tiers: Tier[];
};

export default function PrizeTable({ tiers }: Props) {
  const withPrize = tiers
    .filter((tier) => tier.prize.trim() !== "")
    .sort((a, b) => a.rank - b.rank);

  if (withPrize.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-orange-500/20 bg-[#1f140a]/60 p-4">
      {withPrize.map((tier) => (
        <div key={tier.rank} className="flex items-center gap-3">
          <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
            {rankLabel(tier.rank)}
          </span>
          <span className="rounded-full border border-slate-600 bg-[#120b05] px-4 py-1.5 text-sm font-medium text-white">
            {tier.prize}
          </span>
        </div>
      ))}
    </div>
  );
}
