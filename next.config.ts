import type { NextConfig } from "next";

// 기본 보안 헤더 (계획서 11장). 다른 사이트가 이 사이트를 틀 안에 넣지 못하게 하고, 형식 추측·불필요한 기기 권한을 막는다.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 메타 정보(설명·공유 이미지)를 늘 <head>에 넣는다. 일부 검색·공유 도구가 본문에 늦게 붙는 메타를 못 읽음
  htmlLimitedBots: /.*/,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
