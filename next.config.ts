import type { NextConfig } from "next";
import { buildCsp } from "./lib/csp";

// 기본 보안 헤더 (계획서 11장). 다른 사이트가 이 사이트를 틀 안에 넣지 못하게 하고, 형식 추측·불필요한 기기 권한을 막고,
// 접속할 수 있는 곳을 이 사이트와 Supabase로 제한한다(CSP, lib/csp.ts).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // 다른 사이트가 이 창을 열어 조작하지 못하게 한다 (로그인 팝업을 쓰지 않는다)
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 메타 정보(설명·공유 이미지)를 늘 <head>에 넣는다. 일부 검색·공유 도구가 본문에 늦게 붙는 메타를 못 읽음
  htmlLimitedBots: /.*/,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // 방문자 화면: 정적 캐시를 지키려고 인라인 스크립트를 허용하는 CSP. 관리자(/admin)는 proxy.ts가 nonce 기반 엄격 CSP를 붙인다
      {
        source: "/((?!admin).*)",
        headers: [{ key: "Content-Security-Policy", value: buildCsp({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, dev: process.env.NODE_ENV !== "production" }) }],
      },
    ];
  },
};

export default nextConfig;
