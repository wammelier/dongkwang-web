// Playwright는 Next.js와 달리 .env.local을 읽지 않으므로 직접 읽는다 (이미 있는 환경 변수가 우선)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const file = join(__dirname, "..", ".env.local");
if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const key = line.slice(0, line.indexOf("=")).trim();
    process.env[key] ??= line.slice(line.indexOf("=") + 1).trim();
  }
}

export const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
export const hasAccount = Boolean(E2E_EMAIL && E2E_PASSWORD);
export const SKIP_REASON = "시험 계정이 없습니다. `npm run e2e:setup`으로 만든 뒤 다시 실행하세요 (docs/E2E-테스트.md).";

/** 시험 데이터 표시. 끝나면 이 표시가 붙은 글·주보를 지운다 */
export const MARK = "[E2E]";

/** 아무 로그인도 없는 방문자 */
export const ANONYMOUS = { cookies: [], origins: [] };
