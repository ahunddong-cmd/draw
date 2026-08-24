import { createClient } from "@supabase/supabase-js";

// service_role 키를 쓰는 서버 전용 클라이언트. RLS를 우회하므로 절대
// 클라이언트 컴포넌트에서 import하면 안 되고, PIN 검증을 통과한
// API 라우트 안에서만 사용한다.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
