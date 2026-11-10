import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** 브라우저용: 기본 메일 링크(#access_token=…) 세션 저장, 관리자 파일 올리기 (로그인 쿠키를 그대로 씀) */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { detectSessionInUrl: false },
  });
}
