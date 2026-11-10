/* eslint-disable @typescript-eslint/no-unused-expressions -- 한 줄 판정(조건 ? 통과 : 실패)을 쓰는 점검 스크립트 */
// 배포된 사이트 점검 (읽기만 한다: 데이터를 만들거나 바꾸지 않는다)
//   npm run check:deploy -- https://dongkwang-web.vercel.app
// 실패(✗)가 하나라도 있으면 종료 코드 1. 경고(!)는 공개 전에 확인할 것이라 실패로 세지 않는다.
const arg = process.argv.slice(2).find((a) => !a.startsWith("-"));
if (!arg) {
  console.error("사용법: npm run check:deploy -- https://배포-주소");
  process.exit(2);
}
const base = new URL(arg).origin;

const results = [];
const ok = (name, detail = "") => results.push({ level: "ok", name, detail });
const fail = (name, detail, fix) => results.push({ level: "fail", name, detail, fix });
const warn = (name, detail, fix) => results.push({ level: "warn", name, detail, fix });

const get = (path, init = {}) => fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(30_000), ...init });
const text = async (path) => {
  const res = await get(path);
  return { res, body: res.status === 200 ? await res.text() : "" };
};

// 0) Vercel 보호(미리보기 주소)에 막히면 점검할 수 없다
const home = await get("/");
const location = home.headers.get("location") ?? "";
if (home.status >= 300 && home.status < 400 && /vercel\.com\/sso-api|\/login/.test(location)) {
  console.error("✗ Vercel 로그인 보호에 막힌 주소입니다. 운영(Production) 주소로 점검하세요.");
  process.exit(1);
}

// 1) 공개 페이지
const PAGES = ["/", "/about", "/worship", "/sermons", "/community", "/news", "/bulletins", "/visit"];
const bad = [];
for (const p of PAGES) {
  const r = await get(p);
  if (r.status !== 200) bad.push(`${p} → ${r.status}`);
}
bad.length ? fail("공개 페이지 8개가 모두 열린다", bad.join(", "), "Vercel → Deployments → Build Logs / Runtime Logs 확인") : ok("공개 페이지 8개가 모두 열린다");
(await get("/없는-주소")).status === 404 ? ok("없는 주소는 404") : fail("없는 주소는 404", "404가 아님");

// 2) 데이터베이스 연결 (환경 변수)
const login = await text("/admin/login");
if (/데이터베이스 연결이 필요합니다/.test(login.body)) {
  fail(
    "Supabase에 연결됨",
    "관리자 화면이 '데이터베이스 연결이 필요합니다'로 나옵니다",
    "Vercel 환경 변수 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY를 넣고 다시 배포(Redeploy)",
  );
} else if (login.res.status === 200 && /관리자 로그인/.test(login.body)) {
  ok("Supabase에 연결됨", "관리자 로그인 화면이 열린다");
  const guard = await get("/admin/posts");
  const to = guard.headers.get("location") ?? "";
  guard.status >= 300 && guard.status < 400 && to.includes("/admin/login")
    ? ok("로그인 없이는 관리자 화면이 막힌다")
    : fail("로그인 없이는 관리자 화면이 막힌다", `/admin/posts → ${guard.status} ${to}`, "proxy.ts가 배포에 포함됐는지 확인");
} else {
  fail("관리자 로그인 화면", `상태 ${login.res.status}`, "Runtime Logs 확인");
}

// 3) 사이트 주소 설정 (NEXT_PUBLIC_SITE_URL)
const siteHint = "Vercel 환경 변수 NEXT_PUBLIC_SITE_URL을 이 사이트의 실제 주소로 넣고 다시 배포(Redeploy)";
const sitemap = await text("/sitemap.xml");
const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.length === 0) fail("사이트맵", "읽지 못함", "/sitemap.xml 확인");
else if (locs.every((l) => l.startsWith(base))) ok("사이트맵 주소가 이 사이트", `${locs.length}개`);
else fail("사이트맵 주소가 이 사이트", `예: ${locs.find((l) => !l.startsWith(base))}`, siteHint);

const robots = await text("/robots.txt");
const robotsMap = robots.body.match(/Sitemap:\s*(\S+)/)?.[1] ?? "";
robotsMap.startsWith(base) ? ok("robots.txt의 사이트맵 주소") : fail("robots.txt의 사이트맵 주소", robotsMap || "없음", siteHint);
/Disallow:\s*\/admin/.test(robots.body) ? ok("관리자 화면은 검색에서 제외") : fail("관리자 화면은 검색에서 제외", "Disallow: /admin 없음", "app/robots.ts 확인");

const og = (await text("/")).body.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? "";
og.startsWith(base) ? ok("공유 이미지(og:image) 주소") : fail("공유 이미지(og:image) 주소", og || "없음", siteHint);
if (og.startsWith(base)) {
  const img = await get(new URL(og).pathname + new URL(og).search);
  img.status === 200 && (img.headers.get("content-type") ?? "").startsWith("image/") ? ok("공유 이미지가 열린다") : fail("공유 이미지가 열린다", `상태 ${img.status}`, "app/opengraph-image.png 확인");
}

// 4) 보안 헤더
const headers = home.headers;
const need = { "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "strict-origin-when-cross-origin" };
const missing = Object.entries(need).filter(([k, v]) => headers.get(k) !== v).map(([k]) => k);
if (!headers.get("permissions-policy")) missing.push("permissions-policy");
missing.length ? fail("보안 헤더", `빠짐: ${missing.join(", ")}`, "next.config.ts의 headers 확인") : ok("보안 헤더 4개");
headers.get("x-powered-by") ? warn("X-Powered-By 숨김", headers.get("x-powered-by"), "next.config.ts poweredByHeader: false") : ok("X-Powered-By 숨김");
(headers.get("strict-transport-security") ?? "").includes("max-age") ? ok("HTTPS 강제(HSTS)") : warn("HTTPS 강제(HSTS)", "헤더 없음", "Vercel 도메인은 보통 자동으로 붙습니다");

const csp = headers.get("content-security-policy") ?? "";
if (!csp) fail("콘텐츠 보안 정책(CSP)", "헤더 없음", "next.config.ts와 lib/csp.ts 확인");
else if (!/frame-ancestors 'none'/.test(csp) || !/object-src 'none'/.test(csp) || /connect-src[^;]*(\s\*|\shttps?:(\s|;|$))/.test(csp)) fail("콘텐츠 보안 정책(CSP)", "핵심 항목이 빠졌거나 너무 느슨함", "lib/csp.ts 확인");
else ok("콘텐츠 보안 정책(CSP)");
if (csp && !/supabase\.co/.test(csp)) warn("CSP에 Supabase 주소가 없음", "관리자 파일 올리기·사진이 막힐 수 있음", "Vercel 환경 변수 NEXT_PUBLIC_SUPABASE_URL을 넣고 다시 배포(Redeploy)");
headers.get("cross-origin-opener-policy") ? ok("Cross-Origin-Opener-Policy") : warn("Cross-Origin-Opener-Policy", "헤더 없음");

// 5) 공개 전에 채울 것: 대괄호 자리표시 문구
const PLACEHOLDER = /\[[^\]\[<>]{2,40}\]/g;
const found = new Map();
for (const p of PAGES) {
  const { body } = await text(p);
  const plain = body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
  for (const m of plain.match(PLACEHOLDER) ?? []) if (/[가-힣]/.test(m)) found.set(m, (found.get(m) ?? 0) + 1);
}
found.size
  ? warn(`자리표시 문구 ${found.size}종이 남아 있음 (공개 전에 채울 것)`, [...found.keys()].slice(0, 6).join(" · ") + (found.size > 6 ? " …" : ""), "docs/교회-입력-필요-항목.md 참고")
  : ok("대괄호 자리표시 문구가 없다");

// 결과 출력
const icon = { ok: "✓", fail: "✗", warn: "!" };
console.log(`\n점검 대상: ${base}\n`);
for (const r of results) {
  console.log(`${icon[r.level]} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  if (r.fix && r.level !== "ok") console.log(`    → ${r.fix}`);
}
const n = (l) => results.filter((r) => r.level === l).length;
console.log(`\n통과 ${n("ok")} · 실패 ${n("fail")} · 경고 ${n("warn")}`);
process.exit(n("fail") ? 1 : 0);
