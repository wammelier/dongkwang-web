import { defineConfig } from "@playwright/test";
import "./e2e/env";

// 영상 촬영용 설정 (npm run e2e:video). 일반 E2E(npm run e2e)와 분리해 두었다.
// 동작이 눈에 보이도록 slowMo로 천천히 실행하고, 영상은 e2e/tour/helpers.ts가 e2e-videos/에 저장한다.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/tour",
  workers: 1,
  fullyParallel: false,
  timeout: 10 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalTeardown: "./e2e/cleanup.ts",
  use: { baseURL, channel: "chrome", locale: "ko-KR", timezoneId: "Asia/Seoul", launchOptions: { slowMo: 250 } },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
