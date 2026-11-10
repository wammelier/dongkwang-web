import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/supabase/env";

// 관리자 화면은 검색에 나오지 않게 한다
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
