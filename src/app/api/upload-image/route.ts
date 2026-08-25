import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETTINGS_PIN } from "@/lib/auth";
import { MAX_TIERS, type Tier } from "@/lib/lottery";

const SIMPLE_TYPES = new Set(["qr", "prize"]);
const RANK_TYPE_PATTERN = /^rank-([1-5])$/;

// "rank-1" ~ "rank-5" 형태면 등수를 반환하고, 아니면 null.
function parseRankType(type: string): number | null {
  const match = RANK_TYPE_PATTERN.exec(type);
  if (!match) return null;
  const rank = Number(match[1]);
  return rank <= MAX_TIERS ? rank : null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pin = formData.get("pin");
    const type = formData.get("type");
    const file = formData.get("file");

    if (pin !== SETTINGS_PIN) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const rank = typeof type === "string" ? parseRankType(type) : null;
    const isSimpleType = typeof type === "string" && SIMPLE_TYPES.has(type);

    if (typeof type !== "string" || (!isSimpleType && rank === null) || !(file instanceof File)) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const extension = file.name.split(".").pop() || "png";
    const path = `${type}-image.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("lottery-assets")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("lottery-assets").getPublicUrl(path);

    // 같은 경로를 덮어써도 브라우저가 새 이미지를 받도록 캐시 무력화 쿼리를 붙인다.
    const url = `${publicUrl}?v=${Date.now()}`;

    if (isSimpleType) {
      const column = type === "qr" ? "qr_code_url" : "prize_image_url";
      const { error: updateError } = await supabase
        .from("lottery_settings")
        .upsert({ id: 1, [column]: url, updated_at: new Date().toISOString() });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // 등수별 이미지는 별도 컬럼이 없고 tiers jsonb 배열 안에 들어있으므로,
      // 현재 저장된 tiers를 읽어와 해당 등수만 교체해서 다시 저장한다.
      const { data: row, error: fetchError } = await supabase
        .from("lottery_settings")
        .select("tiers")
        .eq("id", 1)
        .maybeSingle();

      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }

      if (row?.tiers) {
        const tiers = (row.tiers as Tier[]).map((tier) =>
          tier.rank === rank ? { ...tier, resultImageUrl: url } : tier,
        );
        const { error: updateError } = await supabase
          .from("lottery_settings")
          .upsert({ id: 1, tiers, updated_at: new Date().toISOString() });

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
      }
      // 설정이 아직 한 번도 저장되지 않았다면 여기서는 반영하지 않고,
      // 클라이언트가 "뽑기 시작하기"로 전체 설정을 저장할 때 함께 반영된다.
    }

    return NextResponse.json({ url });
  } catch (err) {
    // 서버 환경변수 누락 등 예상치 못한 예외도 항상 JSON으로 응답한다.
    const message = err instanceof Error ? err.message : "업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
