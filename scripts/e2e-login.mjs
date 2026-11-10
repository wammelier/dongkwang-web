// 어드민 E2E 촬영용 로그인 세션 저장.
//   npm run e2e:login
// 크롬 창이 열리면 **사람이 직접** 로그인한다 (비밀번호는 이 스크립트도, 자동화 도구도 입력하지 않는다).
// 대시보드가 열리면 로그인 상태(쿠키)만 e2e/.auth/admin.json에 저장하고 창을 닫는다. 이 파일은 git에 올라가지 않는다.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = new URL("../e2e/.auth/admin.json", import.meta.url);
mkdirSync(new URL("../e2e/.auth/", import.meta.url), { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: false });
const context = await browser.newContext({ viewport: { width: 1100, height: 760 }, locale: "ko-KR", timezoneId: "Asia/Seoul" });
const page = await context.newPage();
await page.goto(`${BASE}/admin/login`);
console.log("크롬 창에서 직접 로그인해 주세요. (최대 15분 기다립니다)");

try {
  // 로그인하면 로그인·비밀번호 화면이 아닌 관리자 화면으로 넘어간다
  await page.waitForURL((url) => url.pathname.startsWith("/admin") && !/\/admin\/(login|forgot-password|set-password)/.test(url.pathname), { timeout: 15 * 60_000 });
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await context.storageState({ path: new URL(OUT).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
  console.log("로그인 상태를 저장했습니다. 창을 닫습니다.");
} finally {
  await browser.close();
}
