import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETTINGS_PIN } from "@/lib/auth";
import { MAX_TIERS, type Tier } from "@/lib/lottery";

const SIMPLE_TYPES = new Set(["qr", "prize", "board-bg"]);
const RANK_TYPE_PATTERN = /^rank-([1-5])$/;

// "rank-1" ~ "rank-5" 형태면 등수를 반환하고, 아니면 null.
function parseRankType(type: string): number | null {
  const match = RANK_TYPE_PATTERN.exec(type);
  if (!match) return null;
  const rank = Number(match[1]);
  return rank <= MAX_TIERS ? rank : null;
}

// 네 모서리 픽셀이 전부 흰색에 가까우면 "흰 배경"으로 판단한다.
function isWhitishPixel(r: number, g: number, b: number): boolean {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min >= 235 && max - min <= 20;
}

const WHITE_FULL = 250; // 이 이상이면 완전 투명 처리
const WHITE_SOFT = 215; // 이 아래는 원본 알파 유지 (부드러운 경계용 완충 구간)
const SPREAD_MAX = 18; // 채널 간 편차가 작아야 '무채색(흰색)'으로 간주

// 굿즈 이미지의 배경이 흰색일 때만, 흰 영역을 투명하게 바꾼 PNG로 다시 인코딩한다.
// 배경이 흰색이 아니면 원본 그대로 돌려줘서 의도치 않은 보정이 일어나지 않게 한다.
async function removeWhiteBackgroundIfApplicable(
  input: Buffer,
): Promise<{ buffer: Buffer; contentType: string; extension: string } | null> {
  const image = sharp(input);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  function pixelAt(x: number, y: number) {
    const idx = (y * width + x) * channels;
    return [data[idx], data[idx + 1], data[idx + 2]] as const;
  }

  const corners = [
    pixelAt(0, 0),
    pixelAt(width - 1, 0),
    pixelAt(0, height - 1),
    pixelAt(width - 1, height - 1),
  ];
  const whiteCorners = corners.filter(([r, g, b]) => isWhitishPixel(r, g, b)).length;

  // 모서리 4곳 중 3곳 이상이 흰색이어야 "흰 배경"으로 간주한다.
  if (whiteCorners < 3) {
    return null;
  }

  // 테두리에서부터 서로 붙어있는 흰색 영역만 배경으로 표시한다(플러드필).
  // 팝콘 알갱이나 주사위처럼 피사체 안에 고립된 흰색은 테두리와 연결되지 않으므로
  // 그대로 남는다 — 전체 픽셀을 한 번에 훑는 방식은 그런 내부 흰색까지 지워버린다.
  function isWhitishAt(x: number, y: number): boolean {
    const idx = (y * width + x) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return min >= WHITE_SOFT && max - min <= SPREAD_MAX;
  }

  const isBackground = new Uint8Array(width * height);
  const queue: number[] = [];

  function trySeed(x: number, y: number) {
    const linear = y * width + x;
    if (!isBackground[linear] && isWhitishAt(x, y)) {
      isBackground[linear] = 1;
      queue.push(linear);
    }
  }

  for (let x = 0; x < width; x += 1) {
    trySeed(x, 0);
    trySeed(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    trySeed(0, y);
    trySeed(width - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const linear = queue[head];
    head += 1;
    const x = linear % width;
    const y = (linear - x) / width;

    const neighbors: Array<[number, number]> = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nLinear = ny * width + nx;
      if (isBackground[nLinear]) continue;
      if (isWhitishAt(nx, ny)) {
        isBackground[nLinear] = 1;
        queue.push(nLinear);
      }
    }
  }

  const out = Buffer.from(data);
  for (let linear = 0; linear < width * height; linear += 1) {
    if (!isBackground[linear]) continue;
    const idx = linear * channels;
    const min = Math.min(out[idx], out[idx + 1], out[idx + 2]);
    const alphaScale =
      min >= WHITE_FULL ? 0 : (WHITE_FULL - min) / (WHITE_FULL - WHITE_SOFT);
    out[idx + 3] = Math.round(out[idx + 3] * alphaScale);
  }

  const buffer = await sharp(out, { raw: { width, height, channels } }).png().toBuffer();
  return { buffer, contentType: "image/png", extension: "png" };
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

    let uploadBody: Buffer | File = file;
    let contentType = file.type;
    let extension = file.name.split(".").pop() || "png";

    // 굿즈 이미지만 흰 배경 자동 투명화 대상이다.
    if (type === "prize") {
      try {
        const original = Buffer.from(await file.arrayBuffer());
        const processed = await removeWhiteBackgroundIfApplicable(original);
        if (processed) {
          uploadBody = processed.buffer;
          contentType = processed.contentType;
          extension = processed.extension;
        }
      } catch {
        // 이미지 처리에 실패해도 원본 업로드는 계속 진행한다.
      }
    }

    const path = `${type}-image.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("lottery-assets")
      .upload(path, uploadBody, { upsert: true, contentType });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("lottery-assets").getPublicUrl(path);

    // 같은 경로를 덮어써도 브라우저가 새 이미지를 받도록 캐시 무력화 쿼리를 붙인다.
    const url = `${publicUrl}?v=${Date.now()}`;

    if (isSimpleType) {
      const column =
        type === "qr"
          ? "qr_code_url"
          : type === "prize"
            ? "prize_image_url"
            : "board_background_url";
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
