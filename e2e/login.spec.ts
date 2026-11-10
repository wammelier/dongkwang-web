import { expect, test } from "@playwright/test";
import { E2E_EMAIL, E2E_PASSWORD, hasAccount, SKIP_REASON } from "./env";

// E2E 1. 로그인
test.describe("로그인", () => {
  test("로그인하지 않으면 관리자 화면 대신 로그인 화면이 나온다", async ({ page }) => {
    await page.goto("/admin/posts");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fposts/);
    await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();
  });

  test("비밀번호가 틀리면 이유를 보여 주고 이메일은 그대로 둔다", async ({ page }) => {
    test.skip(!hasAccount, SKIP_REASON);
    await page.goto("/admin/login");
    await page.getByLabel("이메일").fill(E2E_EMAIL);
    await page.getByLabel("비밀번호").fill("wrong-password-1234");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("이메일")).toHaveValue(E2E_EMAIL);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("맞게 로그인하면 원래 가려던 화면으로 가고, 로그아웃하면 다시 막힌다", async ({ page }) => {
    test.skip(!hasAccount, SKIP_REASON);
    await page.goto("/admin/posts");
    await page.getByLabel("이메일").fill(E2E_EMAIL);
    await page.getByLabel("비밀번호").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/admin\/posts$/);
    await expect(page.getByRole("heading", { name: "공지·행사·이야기" })).toBeVisible();

    await page.getByRole("button", { name: "로그아웃" }).first().click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
