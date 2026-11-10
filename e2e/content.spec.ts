import { expect, test, type Browser } from "@playwright/test";
import { ANONYMOUS, hasAccount, MARK, SKIP_REASON } from "./env";

test.skip(!hasAccount, SKIP_REASON);

/** 로그인하지 않은 방문자로 열기 */
async function asVisitor(browser: Browser, path: string) {
  const context = await browser.newContext({ storageState: ANONYMOUS, locale: "ko-KR", timezoneId: "Asia/Seoul" });
  const page = await context.newPage();
  const response = await page.goto(path);
  return { page, response, close: () => context.close() };
}

const stamp = () => new Date().toISOString().replace(/\D/g, "").slice(4, 14);

// E2E 2. 공지 작성 → 게시 → 공개 확인
test("공지를 게시하면 방문자에게 바로 보인다", async ({ page, browser }) => {
  const title = `${MARK} 게시 확인 ${stamp()}`;
  await page.goto("/admin/posts/new?type=notice");
  await page.locator("#f-title").fill(title);
  await page.locator("#f-summary").fill("E2E 시험용 요약");
  await page.locator("#f-body").fill("첫 줄\n둘째 줄");
  await page.getByRole("button", { name: "게시하기" }).click();

  await expect(page.getByRole("status").filter({ hasText: "게시했습니다" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}/);
  const id = page.url().match(/posts\/([0-9a-f-]{36})/)![1];

  const detail = await asVisitor(browser, `/news/${id}`);
  expect(detail.response?.status()).toBe(200);
  await expect(detail.page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await detail.close();

  const list = await asVisitor(browser, "/news");
  await expect(list.page.getByRole("link", { name: title })).toBeVisible();
  await list.close();
});

// E2E 3. 임시 저장 글은 공개되지 않는다
test("임시 저장 글은 주소를 알아도 방문자에게 보이지 않는다", async ({ page, browser }) => {
  const title = `${MARK} 임시 저장 ${stamp()}`;
  await page.goto("/admin/posts/new?type=story");
  await page.locator("#f-title").fill(title);
  await page.getByRole("button", { name: "임시 저장" }).click();

  await expect(page.getByRole("status").filter({ hasText: "임시 저장" })).toBeVisible();
  const id = page.url().match(/posts\/([0-9a-f-]{36})/)![1];

  const detail = await asVisitor(browser, `/news/${id}`);
  expect(detail.response?.status()).toBe(404);
  await expect(detail.page.getByText(title)).toHaveCount(0);
  await detail.close();

  const list = await asVisitor(browser, "/news");
  await expect(list.page.getByText(title)).toHaveCount(0);
  await list.close();

  // 관리자 목록에는 보인다
  await page.goto("/admin/posts?status=draft");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

// E2E 4. 주보 업로드 → 메인 반영
test("주보를 올려 게시하면 메인의 이번 주 주보가 바뀐다", async ({ page, browser }) => {
  const title = `${MARK} 주보 ${stamp()}`;
  // 가장 최근 날짜여야 메인에 나온다 (끝나면 cleanup이 지움)
  const date = "2099-01-04";
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  );

  await page.goto("/admin/bulletins/new");
  await page.locator("#f-date").fill(date);
  await page.locator("#f-title").fill(title);
  await page.locator('input[type="file"]').setInputFiles({ name: "e2e.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(page.getByTitle("주보 미리보기")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "게시하기" }).click();
  await expect(page.getByRole("status").filter({ hasText: "게시했습니다" })).toBeVisible();

  const home = await asVisitor(browser, "/");
  await expect(home.page.getByRole("heading", { name: title })).toBeVisible();
  await expect(home.page.getByText("1월 4일 주보")).toBeVisible();
  const href = await home.page.getByRole("link", { name: /주보 열기/ }).first().getAttribute("href");
  expect(href).toContain("/storage/v1/object/public/bulletins/");
  const file = await home.page.request.get(href!);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toContain("application/pdf");
  await home.close();
});
