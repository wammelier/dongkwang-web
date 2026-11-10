import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// 로그인 없이 열 수 있는 관리자 경로
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/auth/"];

/**
 * /admin/** 보호: 세션 갱신 + 로그인·활성 관리자 확인 (계획서 3장)
 * 역할(최고 관리자 전용 화면)은 각 페이지의 requireSuperAdmin()과 RLS가 다시 확인한다.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isSupabaseConfigured) return NextResponse.next(); // 관리자 화면이 설정 안내를 보여준다

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getUser()는 인증 서버에 토큰을 검증받는다 (쿠키 내용만 믿지 않음)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) return response;

  const redirectTo = (path: string, reason?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (reason) url.searchParams.set("reason", reason);
    if (path === "/admin/login" && pathname !== "/admin") url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user) return redirectTo("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return redirectTo("/admin/login", "inactive");
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
