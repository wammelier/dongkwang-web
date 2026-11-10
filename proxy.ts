import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { AUTH_COOKIE_OPTIONS } from "@/lib/supabase/cookies";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// 로그인 없이 열 수 있는 관리자 경로
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/auth/"];

/**
 * /admin/** 보호: 세션 갱신 + 로그인·활성 관리자 확인 (계획서 3장)
 * 역할(최고 관리자 전용 화면)은 각 페이지의 requireSuperAdmin()과 RLS가 다시 확인한다.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 관리자 화면은 요청마다 새 nonce로 스크립트를 허용하는 엄격한 CSP를 쓴다 (lib/csp.ts).
  // Next.js는 '요청'의 CSP 헤더에서 nonce를 읽어 자기 스크립트에 붙이므로 요청과 응답 양쪽에 넣는다.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({ supabaseUrl: SUPABASE_URL || undefined, dev: process.env.NODE_ENV !== "production", nonce });
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);
  const withCsp = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  if (!isSupabaseConfigured) return withCsp(NextResponse.next({ request })); // 관리자 화면이 설정 안내를 보여준다

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
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

  if (PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) return withCsp(response);

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

  // 계정 사용 여부(is_active)는 여기서 다시 조회하지 않는다. 관리자 레이아웃과 모든 서버 동작이
  // lib/auth.ts에서 확인하고(요청당 1회), DB 권한(RLS)도 비활성 계정을 막는다.
  return withCsp(response);
}

export const config = {
  matcher: ["/admin/:path*"],
};
