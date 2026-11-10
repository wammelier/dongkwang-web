import { expect, test } from "@playwright/test";
import { recordTour, warm } from "./helpers";

// 로그인 없이 방문자가 보는 홈페이지 전체를 둘러보는 영상 (PC, 모바일 2편)
const PAGES = ["/", "/about", "/worship", "/sermons", "/community", "/news", "/bulletins", "/visit", "/없는-주소"];

test("웹사이트 전체 둘러보기 (PC)", async ({ browser }) => {
  await warm(PAGES);
  await recordTour(browser, { name: "01-웹사이트-PC", viewport: { width: 1280, height: 720 } }, async ({ page, step, scrollThrough, pause }) => {
    const nav = page.locator('nav[aria-label="주 메뉴"]:visible');

    await step("1. 메인 화면 — 절기 배너, 예배 안내, 소식, 공동체");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scrollThrough();

    await step("2. 교회 소개 — 핵심 가치, 담임목사 인사, 섬기는 사람들, 연혁");
    await nav.getByRole("link", { name: "교회 소개" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await scrollThrough();

    await step("3. 예배·말씀 — 예배 시간표와 온라인 예배");
    await nav.getByRole("link", { name: "예배·말씀" }).click();
    await expect(page).toHaveURL(/\/worship$/);
    await scrollThrough();

    await step("4. 설교 목록 → 설교 상세");
    await page.getByRole("link", { name: "설교 목록" }).first().click();
    await expect(page).toHaveURL(/\/sermons$/);
    await pause();
    await page.locator('main a[href^="/sermons/"]').first().click();
    await expect(page).toHaveURL(/\/sermons\/[0-9a-f-]{36}/);
    await scrollThrough({ back: false });
    await page.goBack();

    await step("5. 다음세대·공동체 — 모임별 시간과 장소");
    await nav.getByRole("link", { name: "다음세대·공동체" }).click();
    await expect(page).toHaveURL(/\/community$/);
    await scrollThrough();

    await step("6. 교회 소식 — 공지·행사·교회 이야기 탭");
    await nav.getByRole("link", { name: "교회 소식" }).click();
    await expect(page).toHaveURL(/\/news$/);
    await pause();
    const tabs = page.getByRole("navigation", { name: "소식 종류" });
    for (const name of ["공지", "행사", "교회 이야기", "전체"]) {
      await tabs.getByRole("link", { name, exact: true }).click();
      await pause(700);
    }

    await step("7. 소식 상세 — 행사는 일정과 신청 안내까지");
    await page.locator('main a[href^="/news/"]').first().click();
    await expect(page).toHaveURL(/\/news\/[0-9a-f-]{36}/);
    await scrollThrough({ back: false });
    await page.goBack();

    await step("8. 주보 목록");
    await page.getByRole("link", { name: "주보 보기" }).click();
    await expect(page).toHaveURL(/\/bulletins$/);
    await scrollThrough();

    await step("9. 처음 오셨나요 — 방문 안내와 자주 묻는 질문");
    await page.getByRole("banner").getByRole("link", { name: "처음 오셨나요" }).click();
    await expect(page).toHaveURL(/\/visit$/);
    await scrollThrough({ back: false });
    for (const summary of await page.locator("details summary").all()) {
      await summary.scrollIntoViewIfNeeded();
      await summary.click();
      await pause(700);
    }

    await step("10. 없는 주소로 가면 안내 화면이 나온다");
    await page.goto("/없는-주소");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("찾으시는 내용이 없거나");
    await pause(1500);
    await page.getByRole("link", { name: "메인으로" }).click();
    await expect(page).toHaveURL(/\/$/);
    await step("끝 — 다시 메인 화면으로", 1500);
  });
});

test("웹사이트 전체 둘러보기 (모바일)", async ({ browser }) => {
  await warm(PAGES);
  await recordTour(browser, { name: "02-웹사이트-모바일", viewport: { width: 375, height: 812 }, mobile: true }, async ({ page, step, scrollThrough, pause }) => {
    const openMenu = async () => {
      await page.getByRole("button", { name: "메뉴 열기" }).click();
      await expect(page.locator("#mobile-menu")).toBeVisible();
      await pause(1100);
    };

    await step("1. 메인 — 휴대폰 화면");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scrollThrough({ speed: 1.4 });

    await step("2. 메뉴는 화면 위에 겹쳐 열린다");
    await openMenu();
    await step("3. 교회 소식으로 이동");
    await page.locator("#mobile-menu").getByRole("link", { name: "교회 소식" }).click();
    await expect(page).toHaveURL(/\/news$/);
    await pause();
    await page.locator('main a[href^="/news/"]').first().click();
    await expect(page).toHaveURL(/\/news\/[0-9a-f-]{36}/);
    await scrollThrough({ back: false });

    await step("4. 예배·말씀 — 시간표가 카드로 보인다");
    await openMenu();
    await page.locator("#mobile-menu").getByRole("link", { name: "예배·말씀" }).click();
    await expect(page).toHaveURL(/\/worship$/);
    await scrollThrough({ speed: 1.4 });

    await step("5. 다음세대·공동체");
    await openMenu();
    await page.locator("#mobile-menu").getByRole("link", { name: "다음세대·공동체" }).click();
    await expect(page).toHaveURL(/\/community$/);
    await scrollThrough({ speed: 1.4 });

    await step("6. 처음 오셨나요 — 자주 묻는 질문");
    await page.getByRole("banner").getByRole("link", { name: "처음 오셨나요" }).click();
    await expect(page).toHaveURL(/\/visit$/);
    await scrollThrough({ speed: 1.4, back: false });
    const first = page.locator("details summary").first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
    await pause(1200);
    await step("끝", 1200);
  });
});
