import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeAdminPath } from "@/lib/auth-next";
import { createClient } from "@/lib/supabase/server";

// 비밀번호 재설정 메일의 링크가 도착하는 곳. 두 가지 형태를 받는다.
// - ?code=…        Supabase 기본 메일 (재설정 요청 때 이 브라우저에 저장한 확인값과 맞춰 본다)
// - ?token_hash=…  직접 고친 메일 템플릿 (메일 서버(SMTP)를 연결한 뒤, supabase/templates 참고)
// 기본 초대 메일은 토큰이 # 뒤에 오므로 /admin/auth/callback(브라우저)이 처리한다.
const ALLOWED: EmailOtpType[] = ["invite", "recovery", "email", "magiclink"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const target = safeAdminPath(searchParams.get("next"));

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, origin));
  } else if (tokenHash && type && ALLOWED.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(target, origin));
  }

  return NextResponse.redirect(new URL("/admin/login?reason=link-expired", origin));
}
