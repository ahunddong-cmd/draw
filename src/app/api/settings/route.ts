import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETTINGS_PIN } from "@/lib/auth";
import type { LotterySettings } from "@/lib/lottery";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("lottery_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ settings: null });
    }

    const settings: LotterySettings = {
      participantCount: data.participant_count,
      tiers: data.tiers,
      qrCodeUrl: data.qr_code_url,
      prizeImageUrl: data.prize_image_url,
      eventTitle: data.event_title,
      guideText: data.guide_text,
    };

    return NextResponse.json({ settings });
  } catch (err) {
    // 서버 환경변수 누락 등 예상치 못한 예외도 항상 JSON으로 응답한다.
    const message = err instanceof Error ? err.message : "설정을 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin, settings } = body as { pin: string; settings: LotterySettings };

    if (pin !== SETTINGS_PIN) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    // 클라이언트 쪽 검증을 신뢰하지 않고 서버에서도 최소한의 형태를 확인한다.
    if (typeof settings?.participantCount !== "number" || !Array.isArray(settings?.tiers)) {
      return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("lottery_settings").upsert({
      id: 1,
      participant_count: settings.participantCount,
      tiers: settings.tiers,
      qr_code_url: settings.qrCodeUrl ?? null,
      prize_image_url: settings.prizeImageUrl ?? null,
      event_title: settings.eventTitle ?? "",
      guide_text: settings.guideText ?? "",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
