import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETTINGS_PIN } from "@/lib/auth";

const ALLOWED_TYPES = new Set(["qr", "prize"]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pin = formData.get("pin");
    const type = formData.get("type");
    const file = formData.get("file");

    if (pin !== SETTINGS_PIN) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    if (typeof type !== "string" || !ALLOWED_TYPES.has(type) || !(file instanceof File)) {
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

    const column = type === "qr" ? "qr_code_url" : "prize_image_url";
    const { error: updateError } = await supabase
      .from("lottery_settings")
      .upsert({ id: 1, [column]: url, updated_at: new Date().toISOString() });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    // 서버 환경변수 누락 등 예상치 못한 예외도 항상 JSON으로 응답한다.
    const message = err instanceof Error ? err.message : "업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
