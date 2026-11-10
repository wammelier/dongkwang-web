import type { MetadataRoute } from "next";
import { getPosts, getSermons } from "@/lib/queries";
import { SITE_URL } from "@/lib/supabase/env";

// 검색 노출용 사이트 지도 (계획서 9장 6단계). 게시된 소식·설교 상세 주소를 함께 싣는다.
export const revalidate = 3600;

const PAGES = ["", "/about", "/worship", "/sermons", "/community", "/news", "/bulletins", "/visit"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, sermons] = await Promise.all([getPosts(), getSermons()]);
  return [
    ...PAGES.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 })),
    ...posts.map((p) => ({ url: `${SITE_URL}/news/${p.id}`, lastModified: p.publishedAt, priority: 0.5 })),
    ...sermons.map((s) => ({ url: `${SITE_URL}/sermons/${s.id}`, lastModified: s.preachedOn, priority: 0.5 })),
  ];
}
