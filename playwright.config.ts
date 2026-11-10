import { defineConfig } from "@playwright/test";
import "./e2e/env";

// 핵심 E2E 4건 (계획서 11장). 실제 Supabase에 시험 계정으로 접속한다.
// 브라우저는 내려받지 않고 PC에 설치된 크롬을 쓴다.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // 같은 DB를 쓰므로 하나씩
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalTeardown: "./e2e/cleanup.ts",
  use: { baseURL, channel: "chrome", locale: "ko-KR", timezoneId: "Asia/Seoul", trace: "retain-on-failure" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "login", testMatch: /login\.spec\.ts/ },
    { name: "content", testMatch: /content\.spec\.ts/, dependencies: ["setup"], use: { storageState: "e2e/.auth/editor.json" } },
  ],
  // npm을 거치면 Windows에서 끝난 뒤에도 Next가 남으므로 node로 직접 실행한다
  webServer: {
    command: "node node_modules/next/dist/bin/next dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
