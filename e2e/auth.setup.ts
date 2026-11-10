import { expect, test as setup } from "@playwright/test";
import { E2E_EMAIL, E2E_PASSWORD, hasAccount, SKIP_REASON } from "./env";

// 한 번 로그인해 세션을 저장하고 콘텐츠 시험에서 다시 쓴다
setup("시험 계정으로 로그인", async ({ page }) => {
  setup.skip(!hasAccount, SKIP_REASON);
  await page.goto("/admin/login");
  await page.getByLabel("이메일").fill(E2E_EMAIL);
  await page.getByLabel("비밀번호").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: /안녕하세요/ })).toBeVisible();
  await page.context().storageState({ path: "e2e/.auth/editor.json" });
});
