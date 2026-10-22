import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETTINGS_PIN } from "@/lib/auth";
import type { Question, RewardTier } from "@/lib/ox-quiz";

// "question-<id>" 또는 "prize-<id>" 형태만 허용한다.
const TYPE_PATTERN = /^(question|prize)-(.+)$/;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pin = formData.get("pin");
    const type = formData.get("type");
    const file = formData.get("file");

    if (pin !== SETTINGS_PIN) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const match = typeof type === "string" ? TYPE_PATTERN.exec(type) : null;
    if (!match || !(file instanceof File)) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const [, kind, itemId] = match;

    const supabase = createAdminClient();
    const extension = file.name.split(".").pop() || "png";
    // 기존 종이뽑기용 lottery-assets 버킷을 그대로 쓰되, 경로를 ox- 접두사로 구분한다.
    const path = `ox-${type}-image.${extension}`;

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

    // 문제/경품은 등수처럼 고정된 개수가 아니라 자유롭게 추가·삭제되는 목록이라
    // id로 찾아서 해당 항목에만 이미지를 반영한다. 설정이 아직 한 번도 저장되지
    // 않았다면 여기서는 반영하지 않고, 클라이언트가 전체 저장을 할 때 함께 반영된다.
    const column = kind === "question" ? "questions" : "reward_tiers";
    const { data: row, error: fetchError } = await supabase
      .from("ox_quiz_settings")
      .select(column)
      .eq("id", 1)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (row) {
      const items = (row as Record<string, (Question | RewardTier)[]>)[column];
      const updatedItems = items.map((item) =>
        item.id === itemId ? { ...item, imageUrl: url } : item,
      );
      const { error: updateError } = await supabase
        .from("ox_quiz_settings")
        .upsert({ id: 1, [column]: updatedItems, updated_at: new Date().toISOString() });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ url });
  } catch (err) {
    // 서버 환경변수 누락 등 예상치 못한 예외도 항상 JSON으로 응답한다.
    const message = err instanceof Error ? err.message : "업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
