// 공개 페이지가 읽는 유일한 통로.
// Supabase가 설정되어 있으면 anon 키 + RLS로 게시본만 읽고, 아니면 lib/seed.ts 예시 데이터를 쓴다.
import "server-only";
import { BANNER_COLUMNS } from "./banner-admin";
import {
  toBulletin,
  toChurchInfo,
  toCommunity,
  toFaq,
  toPost,
  toSermon,
  toWorshipTime,
} from "./mappers";
import { DEFAULT_SECTIONS, normalizeSections, type SectionSetting } from "./main-sections";
import type { BannerRow } from "./main-banner";
import * as seed from "./seed";
import { publicFileUrl } from "./files";
import { isSupabaseConfigured } from "./supabase/env";
import { publicClient } from "./supabase/public";
import type { Post, PostType, Status } from "./types";

const db = isSupabaseConfigured;

/** 조회 실패는 로그로 남기고 구역을 비워 페이지 전체가 깨지지 않게 한다 */
function rows<T>(result: { data: T[] | null; error: { message: string } | null }, what: string): T[] {
  if (result.error) {
    console.error(`[queries] ${what} 조회 실패:`, result.error.message);
    return [];
  }
  return result.data ?? [];
}

const isPublished = (row: { status: Status }) => row.status === "published";

/** 계획서 5.2 공개 노출 조건 (예시 데이터용. DB는 published_posts 뷰가 같은 조건을 건다) */
function isVisible(post: Post, now: Date) {
  if (!isPublished(post)) return false;
  if (post.publishStart && new Date(post.publishStart) > now) return false;
  if (post.publishEnd && new Date(post.publishEnd) < now) return false;
  return true;
}

const byDateDesc = <T,>(pick: (row: T) => string) => (a: T, b: T) => pick(b).localeCompare(pick(a));

export async function getChurchInfo() {
  if (!db) return seed.churchInfo;
  const { data, error } = await publicClient("church").from("church_info").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    console.error("[queries] 교회 정보 조회 실패:", error?.message ?? "행 없음");
    return seed.churchInfo;
  }
  return toChurchInfo(data);
}

export async function getWorshipTimes() {
  if (!db) return seed.worshipTimes.filter((w) => w.isActive);
  const res = await publicClient("church").from("worship_times").select("*").eq("is_active", true).order("sort");
  return rows(res, "예배 시간").map(toWorshipTime);
}

export async function getMainWorship() {
  return (await getWorshipTimes()).find((w) => w.isMain) ?? null;
}

export async function getCommunities() {
  if (!db) return seed.communities.filter((c) => c.isActive);
  const res = await publicClient("communities").from("communities").select("*").eq("is_active", true).order("sort");
  return rows(res, "공동체").map(toCommunity);
}

export async function getFaqs() {
  if (!db) return seed.faqs.filter((f) => f.isActive);
  const res = await publicClient("church").from("faqs").select("*").eq("is_active", true).order("sort");
  return rows(res, "FAQ").map(toFaq);
}

export async function getSermons(limit = 50) {
  if (!db) return seed.sermons.filter(isPublished).sort(byDateDesc((s) => s.preachedOn));
  const res = await publicClient("sermons")
    .from("published_sermons")
    .select("*")
    .order("preached_on", { ascending: false })
    .limit(limit);
  return rows(res, "설교").map(toSermon);
}

export async function getSermon(id: string) {
  if (!db) return seed.sermons.find((s) => s.id === id && isPublished(s)) ?? null;
  if (!isUuid(id)) return null;
  const { data } = await publicClient("sermons").from("published_sermons").select("*").eq("id", id).maybeSingle();
  return data ? toSermon(data) : null;
}

export async function getBulletins(limit = 50) {
  if (!db) return seed.bulletins.filter(isPublished).sort(byDateDesc((b) => b.date));
  const client = publicClient("bulletins");
  const publicUrl = (path: string) => client.storage.from("bulletins").getPublicUrl(path).data.publicUrl;
  const res = await client.from("published_bulletins").select("*").order("date", { ascending: false }).limit(limit);
  return rows(res, "주보").map((r) => toBulletin(r, publicUrl));
}

export async function getPosts(type?: PostType, now = new Date()) {
  if (!db) {
    return seed.posts
      .filter((p) => isVisible(p, now) && (!type || p.type === type))
      .sort(byDateDesc((p) => p.publishedAt));
  }
  let query = publicClient("posts").from("published_posts").select("*").order("published_at", { ascending: false });
  if (type) query = query.eq("type", type);
  return rows(await query.limit(100), "소식").map(toPost);
}

/** 메인 소식: 고정 공지 우선 */
export async function getMainNews(limit: number, now = new Date()) {
  const posts = await getPosts(undefined, now);
  return [...posts.filter((p) => p.isPinned), ...posts.filter((p) => !p.isPinned)].slice(0, limit);
}

export async function getPost(id: string, now = new Date()) {
  if (!db) return seed.posts.find((p) => p.id === id && isVisible(p, now)) ?? null;
  if (!isUuid(id)) return null;
  const client = publicClient("posts");
  const { data } = await client.from("published_posts").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  // 사진은 공개 동의를 확인한 것만 (RLS도 같은 조건, 관리자가 공개 화면을 볼 때를 위해 한 번 더)
  const { data: files } = await client
    .from("post_files")
    .select("kind, path, name, size")
    .eq("post_id", id)
    .or("kind.eq.attachment,has_consent.eq.true")
    .order("sort");
  return {
    ...toPost(data),
    files: (files ?? []).map((f) => ({
      kind: f.kind,
      name: f.name,
      size: f.size,
      url: publicFileUrl(f.kind === "image" ? "images" : "attachments", f.path),
    })),
  };
}

/** 메인 구역 순서와 노출 여부 (관리자 '메인 구역') */
export async function getMainSections(): Promise<SectionSetting[]> {
  if (!db) return DEFAULT_SECTIONS;
  const res = await publicClient("church").from("main_sections").select("key, is_visible, sort, headline, body");
  if (res.error) {
    console.error("[queries] 메인 구역 조회 실패:", res.error.message);
    return DEFAULT_SECTIONS;
  }
  return normalizeSections(res.data ?? []);
}

/**
 * 메인 배너 후보 (게시 중이고 기간 안인 특별 배너·절기 문구). 고르는 규칙은 lib/main-banner.ts.
 * 특별 배너 시작·종료가 1시간 캐시에 묶이지 않도록 매번 새로 읽는다 (기획서 15.5).
 */
export async function getBannerRows(): Promise<BannerRow[]> {
  if (!db) return [];
  const res = await publicClient("banners", { fresh: true }).from("main_banners").select(BANNER_COLUMNS);
  return rows(res, "메인 배너") as BannerRow[];
}

/** 행사는 종료 시각이 지나면 '지난 행사'로 */
export function isPastEvent(post: Post, now = new Date()) {
  return post.type === "event" && !!post.eventEnd && new Date(post.eventEnd) < now;
}

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
