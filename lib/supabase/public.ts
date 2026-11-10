import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// 공개 페이지용: 쿠키 없이 anon 키로만 읽는다(RLS: 게시된 것만).
// 응답은 태그를 붙여 캐시하고, 관리자에서 게시·수정하면 updateTag(태그)로 즉시 갱신한다 (계획서 7장).
export type CacheTag = "posts" | "bulletins" | "sermons" | "church" | "banners" | "communities";

export const REVALIDATE_SECONDS = 3600;

/** fresh: 캐시 없이 매번 읽기 (시각에 따라 바뀌는 메인 배너용) */
export function publicClient(tag: CacheTag, { fresh = false }: { fresh?: boolean } = {}) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, fresh ? { ...init, cache: "no-store" } : { ...init, next: { revalidate: REVALIDATE_SECONDS, tags: [tag] } }),
    },
  });
}
