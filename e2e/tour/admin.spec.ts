import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { MARK } from "../env";
import { recordTour, typeInto, warmAuthed } from "./helpers";

// 로그인한 관리자가 쓰는 화면 전체를 둘러보는 영상.
// 로그인은 사람이 `npm run e2e:login`으로 미리 해 둔 상태(쿠키)를 쓴다. 비밀번호는 이 코드에 없다.
// 운영 데이터를 건드리지 않도록: 만드는 것은 모두 [E2E] 제목(끝나면 cleanup이 지움), 주보·설교는 아주 옛 날짜,
// 교회 정보·메인 구역·계정은 보기만 하고, 절기 스위치는 켰다가 반드시 끈다.
const STATE = join(__dirname, "..", ".auth", "admin.json");
const PHOTO = join(__dirname, "..", "fixtures", "photo.png");
const PDF = join(__dirname, "..", "fixtures", "bulletin.pdf");

const ADMIN_PATHS = [
  "/admin",
  "/admin/posts",
  "/admin/posts/new",
  "/admin/bulletins",
  "/admin/bulletins/new",
  "/admin/sermons",
  "/admin/sermons/new",
  "/admin/main",
  "/admin/banners",
  "/admin/banners/special/new",
  "/admin/church-info",
  "/admin/church-info?tab=visit",
  "/admin/church-info?tab=about",
  "/admin/church-info?tab=worship",
  "/admin/church-info?tab=groups",
  "/admin/church-info?tab=faq",
  "/admin/accounts",
  "/news",
  "/sermons",
  "/bulletins",
];

const status = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });
const idOf = (page: Page, kind: string) => page.url().match(new RegExp(`${kind}/([0-9a-f-]{36})`))![1];

test("어드민 전체 둘러보기 (PC)", async ({ browser }) => {
  test.skip(!existsSync(STATE), "로그인 상태가 없습니다. `npm run e2e:login`으로 직접 로그인해 저장한 뒤 다시 실행하세요.");
  await warmAuthed(ADMIN_PATHS, STATE);

  await recordTour(browser, { name: "03-어드민-PC", viewport: { width: 1280, height: 720 }, storageState: STATE }, async ({ page, step, scrollThrough, pause }, context) => {
    const side = page.getByRole("navigation", { name: "관리자 메뉴" });
    const noticeTitle = `${MARK} 촬영용 공지`;

    // ───────────── 대시보드
    await step("1. 대시보드 — 배너 상태, 콘텐츠 현황, 빠른 글쓰기");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /안녕하세요/ })).toBeVisible();
    await scrollThrough();

    // ───────────── 공지: 임시 저장 → 사진 → 게시 → 휴지통
    await step("2. 공지·행사·이야기 — 목록과 새 글 쓰기");
    await side.getByRole("link", { name: "공지·행사·이야기" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "공지·행사·이야기" })).toBeVisible();
    await pause();
    await page.getByRole("link", { name: "+ 새 글 쓰기" }).click();
    await expect(page).toHaveURL(/posts\/new/);
    await typeInto(page, "#f-title", noticeTitle);
    await typeInto(page, "#f-summary", "관리자 화면 촬영용 글입니다. 곧 지워집니다.");
    await typeInto(page, "#f-body", "첫 줄입니다.\n둘째 줄입니다.");

    await step("3. 미리보기 — 홈페이지에서 보일 모양을 저장 전에 확인");
    await page.getByRole("tab", { name: "미리보기" }).click();
    await pause(1800);
    await page.getByRole("tab", { name: "편집" }).click();

    await step("4. 임시 저장 — 홈페이지에는 아직 열리지 않는다");
    await page.getByRole("button", { name: "임시 저장" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}/);
    await expect(status(page, "임시 저장")).toBeVisible();
    const postId = idOf(page, "posts");
    const editUrl = `/admin/posts/${postId}`;
    await pause();
    await page.goto(`/news/${postId}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("찾으시는 내용이 없거나");
    await step("↑ 방문자에게는 '없는 페이지'로 보인다", 1800);
    await page.goto(editUrl);

    await step("5. 사진 올리기 — 사람이 나온 사진은 공개 동의를 확인해야 보인다");
    await page.locator('input[type="file"]').first().setInputFiles(PHOTO);
    const photo = page.getByRole("img", { name: "photo.png" });
    await expect(photo).toBeVisible({ timeout: 30_000 });
    await pause(1400);
    await expect(page.getByText("동의 확인 전 · 숨김")).toBeVisible();
    // 서버 저장이 끝나야 체크 표시가 바뀌므로 check() 대신 누르고 기다린다
    const consent = photo.locator("xpath=ancestor::li[1]").getByRole("checkbox");
    await consent.click();
    await expect(status(page, "공개 동의를 확인했습니다")).toBeVisible();
    await expect(consent).toBeChecked();
    await pause(1200);

    await step("6. 게시하기 — 홈페이지에 바로 나타난다");
    await page.getByRole("button", { name: "게시하기" }).click();
    await expect(status(page, "게시했습니다")).toBeVisible();
    await pause(1200);
    await page.goto(`/news/${postId}`);
    await expect(page.getByRole("heading", { level: 1, name: noticeTitle })).toBeVisible();
    await expect(page.locator("main img").first()).toBeVisible();
    await step("↑ 방문자 화면: 글과 사진이 보인다", 2200);

    await step("7. 휴지통 → 복구 → 완전 삭제");
    await page.goto(editUrl);
    await page.getByRole("button", { name: "휴지통으로 옮기기" }).click();
    await expect(page).toHaveURL(/status=trashed/);
    const trashed = page.locator("main li", { hasText: noticeTitle });
    await expect(trashed).toBeVisible();
    await pause();
    await trashed.getByRole("button", { name: "복구" }).click();
    await expect(status(page, "복구했습니다")).toBeVisible();
    await pause(1200);
    await page.goto(editUrl);
    await page.getByRole("button", { name: "휴지통으로 옮기기" }).click();
    await expect(page).toHaveURL(/status=trashed/);
    await page.locator("main li", { hasText: noticeTitle }).getByRole("button", { name: "완전 삭제" }).click();
    await expect(status(page, "완전히 삭제했습니다")).toBeVisible();
    await pause(1500);

    await step("8. 행사 — 일시·장소·신청 링크 칸이 추가로 나온다");
    await page.goto("/admin/posts/new?type=event");
    await typeInto(page, "#f-title", `${MARK} 촬영용 행사`);
    await page.locator("#f-eventStart").fill("2099-01-04T10:00");
    await typeInto(page, "#f-eventPlace", "본당");
    await pause(1200);
    await page.getByRole("button", { name: "임시 저장" }).click();
    await expect(status(page, "임시 저장")).toBeVisible();
    await pause(1200);

    // ───────────── 주보
    await step("9. 주보 — PDF를 올리면 바로 미리 볼 수 있다");
    await side.getByRole("link", { name: "주보" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "주보" })).toBeVisible();
    await pause();
    await page.getByRole("link", { name: "+ 주보 올리기" }).click();
    await page.locator("#f-date").fill("2000-01-02");
    await page.locator("#f-title").fill(`${MARK} 촬영용 주보`);
    await page.locator('input[type="file"]').setInputFiles(PDF);
    await expect(page.getByTitle("주보 미리보기")).toBeVisible({ timeout: 30_000 });
    await pause(2200);
    await page.getByRole("button", { name: "게시하기" }).click();
    await expect(status(page, "게시했습니다")).toBeVisible();
    await pause(1000);
    await page.goto("/bulletins");
    const bulletin = page.getByText(`${MARK} 촬영용 주보`);
    await bulletin.scrollIntoViewIfNeeded();
    await expect(bulletin).toBeVisible();
    await step("↑ 방문자 화면의 주보 목록에도 올라갔다", 2000);

    // ───────────── 설교
    await step("10. 설교 — 제목·본문·설교자·영상 링크");
    await page.goto("/admin");
    await side.getByRole("link", { name: "설교" }).click();
    await page.getByRole("link", { name: "+ 설교 등록" }).click();
    await typeInto(page, "#f-title", `${MARK} 촬영용 설교`);
    await page.locator("#f-preachedOn").fill("2000-01-02");
    await typeInto(page, "#f-scripture", "요한일서 4:7–12");
    await typeInto(page, "#f-preacher", "촬영");
    await page.locator("#f-videoUrl").fill("https://example.com/video");
    await typeInto(page, "#f-summary", "촬영용 요약입니다.");
    await pause(1500);
    await page.getByRole("button", { name: "게시하기" }).click();
    await expect(status(page, "게시했습니다")).toBeVisible();
    await pause(1000);
    await page.goto("/sermons");
    const sermon = page.getByText(`${MARK} 촬영용 설교`);
    await sermon.scrollIntoViewIfNeeded();
    await expect(sermon).toBeVisible();
    await step("↑ 방문자 화면의 설교 목록에도 올라갔다", 2000);

    // ───────────── 절기 배너
    await step("11. 절기 배너 — 켜지 않으면 연중 배너 유지, 켠 절기만 그 날짜에 바뀐다");
    await page.goto("/admin");
    await side.getByRole("link", { name: "절기 배너" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "절기 배너" })).toBeVisible();
    await scrollThrough({ speed: 1.2 });
    const previewLine = page.locator('section[aria-labelledby="by-date"] p[aria-live="polite"]');
    await page.locator("#preview-date").scrollIntoViewIfNeeded();
    await page.locator("#preview-date").fill("2026-12-01");
    await expect(previewLine).toContainText("연중");
    await step("12월 1일 미리보기 — 대림절 기간이지만 켜지 않아 연중 유지", 2400);
    const advent = page.getByRole("switch", { name: "대림절 배너 적용" });
    try {
      await advent.scrollIntoViewIfNeeded();
      await advent.click();
      await expect(advent).toHaveAttribute("aria-checked", "true");
      await page.locator("#preview-date").scrollIntoViewIfNeeded();
      await page.locator("#preview-date").fill("2026-12-02");
      await page.locator("#preview-date").fill("2026-12-01");
      await expect(previewLine).toContainText("대림절");
      await step("대림절을 켜자 같은 날짜가 대림절 배너로 바뀐다", 2600);
    } finally {
      // 어떤 경우에도 원래대로 꺼 둔다
      await advent.scrollIntoViewIfNeeded();
      if ((await advent.getAttribute("aria-checked")) === "true") await advent.click();
      await expect(advent).toHaveAttribute("aria-checked", "false");
    }
    await step("다시 끄면 원래대로 연중 배너를 유지한다", 1500);

    await step("12. 특별 배너 — 행사 기간에만 거는 배너 (임시 저장까지만)");
    await page.goto("/admin/banners");
    await page.getByRole("link", { name: "+ 특별 배너 만들기" }).click();
    await typeInto(page, "#f-eyebrow", "교회 소식");
    await typeInto(page, "#f-title", `${MARK} 촬영용 특별 배너`);
    await typeInto(page, "#f-description", "촬영용입니다.");
    await page.locator("#f-publishEnd").fill("2099-01-05T00:00");
    await pause(1200);
    await page.getByRole("radio", { name: "휴대폰" }).click();
    await pause(1600);
    await page.getByRole("radio", { name: "PC" }).click();
    await page.getByRole("button", { name: "임시 저장" }).click();
    // 새 배너는 저장 뒤 편집 화면으로 넘어가 "저장했습니다."라고 알려 준다
    await expect(page).toHaveURL(/banners\/special\/[0-9a-f-]{36}/);
    await expect(status(page, "저장했습니다")).toBeVisible();
    await pause(1200);

    // ───────────── 최고 관리자 화면 (보기만)
    await step("13. 메인 구역 — 켜고 끄기와 순서 (보기만)");
    await side.getByRole("link", { name: "메인 구역" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "메인 구역" })).toBeVisible();
    await scrollThrough({ speed: 1.2 });

    await step("14. 교회 정보 — 탭별 입력 화면 (보기만)");
    await side.getByRole("link", { name: "교회 정보" }).click();
    const tabs = page.getByRole("navigation", { name: "교회 정보 항목" });
    for (const name of ["기본 정보", "방문 안내", "교회 소개", "예배 시간", "공동체", "자주 묻는 질문"]) {
      await tabs.getByRole("link", { name }).click();
      await expect(tabs.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
      await pause(1500);
    }

    await step("15. 관리자 계정 — 역할과 활성 상태 (보기만)");
    await side.getByRole("link", { name: "관리자 계정" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "관리자 계정" })).toBeVisible();
    await scrollThrough({ speed: 1.2 });

    // ───────────── 로그인하지 않은 상태
    // 실제 '로그아웃' 버튼은 누르지 않는다: Supabase signOut()은 이 계정의 다른 기기·창 로그인까지 모두 끊는다.
    // (로그아웃 동작 자체는 시험 전용 계정을 쓰는 e2e/login.spec.ts가 검증한다)
    await step("16. 로그인 상태가 없으면 관리자 화면은 로그인 화면으로 보낸다 (쿠키 삭제)");
    await context.clearCookies();
    await page.goto("/admin/posts");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fposts/);
    await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();
    await step("끝 — 로그인하지 않으면 어떤 관리자 화면도 열리지 않는다", 2200);
  });
});
