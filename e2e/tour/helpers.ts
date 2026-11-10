// 영상 촬영용 도구: 자막, 마우스 커서 표시, 천천히 스크롤, 영상 저장
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import "../env";

export const VIDEO_DIR = join(__dirname, "..", "..", "e2e-videos");
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 페이지마다 자막 띠와 마우스 커서(빨간 점)를 그린다. 자막은 sessionStorage에 두어 화면을 옮겨도 이어진다 */
const OVERLAY = `
(() => {
  const mount = () => {
    if (document.getElementById('__e2e_caption')) return;
    // 개발 서버가 구석에 띄우는 'N' 표시는 영상에서 숨긴다
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal{display:none!important}';
    document.documentElement.append(style);
    const cap = document.createElement('div');
    cap.id = '__e2e_caption';
    cap.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);width:max-content;max-width:92vw;z-index:2147483647;pointer-events:none;' +
      'background:rgba(20,30,26,.88);color:#fff;font:700 22px/1.35 "Malgun Gothic",sans-serif;padding:10px 20px;border-radius:12px;text-align:center;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.3);display:none';
    const dot = document.createElement('div');
    dot.id = '__e2e_cursor';
    dot.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;z-index:2147483647;pointer-events:none;' +
      'background:rgba(239,68,68,.55);border:2px solid #fff;box-shadow:0 0 0 2px rgba(239,68,68,.8);transition:transform .12s;display:none';
    document.documentElement.append(cap, dot);
    const set = () => {
      const t = sessionStorage.getItem('__e2e_caption') || '';
      cap.textContent = t;
      cap.style.display = t ? 'block' : 'none';
      if (window.innerWidth < 500) cap.style.font = '700 16px/1.35 "Malgun Gothic",sans-serif';
    };
    set();
    window.addEventListener('storage', set);
    window.__e2eCaption = set;
    document.addEventListener('mousemove', (e) => {
      dot.style.display = 'block';
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
    }, true);
    document.addEventListener('mousedown', () => { dot.style.transform = 'scale(.6)'; }, true);
    document.addEventListener('mouseup', () => { dot.style.transform = 'scale(1)'; }, true);
  };
  if (document.documentElement) mount();
  document.addEventListener('DOMContentLoaded', mount);
})();`;

export type Tour = {
  page: Page;
  /** 자막을 바꾸고 잠깐 보여 준다 */
  step: (text: string, hold?: number) => Promise<void>;
  /** 화면을 위에서 아래로 천천히 훑는다 */
  scrollThrough: (opts?: { speed?: number; back?: boolean }) => Promise<void>;
  pause: (ms?: number) => Promise<void>;
};

/** 더 쓸 수 있도록 페이지 자체는 그대로 돌려주고, 영상 파일은 끝나면 e2e-videos/<name>.webm 으로 저장 */
export async function recordTour(
  browser: Browser,
  opts: { name: string; viewport: { width: number; height: number }; mobile?: boolean; storageState?: string },
  run: (tour: Tour, context: BrowserContext) => Promise<void>,
) {
  mkdirSync(VIDEO_DIR, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), "tour-"));
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: opts.viewport,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    recordVideo: { dir: tmp, size: opts.viewport },
    ...(opts.mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
    ...(opts.storageState ? { storageState: opts.storageState } : {}),
  });
  await context.addInitScript(OVERLAY);
  const page = await context.newPage();
  // 확인 창(휴지통 완전 삭제 등)은 촬영 중 자동으로 '확인'
  page.on("dialog", (d) => d.accept());

  const pause = (ms = 900) => page.waitForTimeout(ms);
  const tour: Tour = {
    page,
    pause,
    async step(text, hold = 1100) {
      // 지금 열려 있는 화면에는 바로, 다음에 열리는 화면에는 시작 스크립트로 자막을 이어 준다
      const apply = (t: string) => {
        try {
          sessionStorage.setItem("__e2e_caption", t);
          (window as unknown as { __e2eCaption?: () => void }).__e2eCaption?.();
        } catch {
          /* 빈 페이지에서는 저장소를 쓸 수 없다 */
        }
      };
      await page.addInitScript(apply, text);
      if (page.url().startsWith("http")) await page.evaluate(apply, text);
      await pause(hold);
    },
    async scrollThrough({ speed = 1, back = true } = {}) {
      await page.evaluate(async (v) => {
        const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const max = () => document.documentElement.scrollHeight - window.innerHeight;
        const stepPx = Math.max(60, Math.round(window.innerHeight * 0.18 * v));
        for (let y = 0; y < max(); y += stepPx) {
          window.scrollTo({ top: y });
          await wait(150);
        }
        window.scrollTo({ top: max() });
        await wait(500);
      }, speed);
      if (back) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
        await pause(900);
      }
    },
  };

  let failure: unknown;
  try {
    await run(tour, context);
    await pause(1200);
  } catch (e) {
    failure = e;
  } finally {
    const video = page.video();
    await context.close();
    if (video) {
      const target = join(VIDEO_DIR, `${opts.name}.webm`);
      try {
        rmSync(target, { force: true });
        // 임시 폴더(C:)와 프로젝트(D:)가 다른 드라이브일 수 있어 이름 바꾸기 대신 복사한다
        copyFileSync(await video.path(), target);
      } catch (e) {
        console.error("영상 저장 실패:", e);
      }
    }
    rmSync(tmp, { recursive: true, force: true });
  }
  if (failure) throw failure;
}

/** 첫 방문 때 개발 서버의 컴파일 대기가 영상에 나오지 않도록 미리 한 번씩 열어 둔다 */
export async function warm(paths: string[]) {
  for (const p of paths) {
    try {
      await fetch(`${BASE_URL}${p}`, { redirect: "manual" });
    } catch {
      /* 서버가 아직 준비 중이면 건너뜀 */
    }
  }
}

/** 로그인한 상태로 관리자 화면을 미리 한 번씩 열어 둔다 (쿠키는 이 PC의 개발 서버로만 보낸다) */
export async function warmAuthed(paths: string[], storageStatePath: string) {
  const { cookies } = JSON.parse(readFileSync(storageStatePath, "utf8")) as { cookies: { name: string; value: string }[] };
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  for (const p of paths) {
    try {
      await fetch(`${BASE_URL}${p}`, { headers: { cookie }, redirect: "manual" });
    } catch {
      /* 건너뜀 */
    }
  }
}

/** 사람이 타자 치듯 입력 (영상에서 입력 과정이 보이도록) */
export async function typeInto(page: Page, selector: string, text: string) {
  const el = page.locator(selector);
  await el.click();
  await el.pressSequentially(text, { delay: 45 });
}
