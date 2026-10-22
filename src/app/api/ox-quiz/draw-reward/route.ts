import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RewardTier } from "@/lib/ox-quiz";

// 정답을 맞혔을 때 경품을 추첨한다. 클라이언트에서 직접 확률/수량을 계산하게 하면
// 개발자 도구로 조작할 수 있으니, 서버에서만 추첨하고 수량도 서버에서 바로 차감한다.
// 운영자 설정이 아니라 참가자가 정답을 맞혔을 때 호출하는 일반 플레이 동작이라 PIN은 요구하지 않는다.
export async function POST() {
  try {
    const supabase = createAdminClient();
    const { data: row, error: fetchError } = await supabase
      .from("ox_quiz_settings")
      .select("reward_tiers")
      .eq("id", 1)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const tiers = (row?.reward_tiers ?? []) as RewardTier[];
    const available = tiers.filter((tier) => tier.remaining > 0);

    let won: RewardTier | null = null;
    let roll = Math.random() * 100;
    for (const tier of available) {
      roll -= tier.ratio;
      if (roll < 0) {
        won = tier;
        break;
      }
    }

    if (won) {
      const updatedTiers = tiers.map((tier) =>
        tier.id === won!.id ? { ...tier, remaining: tier.remaining - 1 } : tier,
      );
      const { error: updateError } = await supabase
        .from("ox_quiz_settings")
        .upsert({ id: 1, reward_tiers: updatedTiers, updated_at: new Date().toISOString() });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ tier: won });
  } catch (err) {
    const message = err instanceof Error ? err.message : "추첨에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
