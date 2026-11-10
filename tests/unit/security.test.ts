import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCsp } from "@/lib/csp";

const SUPA = "https://abcd1234.supabase.co";
const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `) || d === name) ?? "";

describe("CSP (lib/csp.ts)", () => {
  const prod = buildCsp({ supabaseUrl: `${SUPA}/rest/v1/` });
  const dev = buildCsp({ supabaseUrl: SUPA, dev: true });

  it("운영: eval을 허용하지 않고, 틀 안에 넣기·플러그인·다른 곳으로 폼 전송을 막는다", () => {
    expect(directive(prod, "script-src")).not.toContain("unsafe-eval");
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("base-uri 'self'");
    expect(prod).toContain("form-action 'self'");
    expect(prod).toContain("upgrade-insecure-requests");
  });

  it("Supabase는 주소(origin)만 허용하고, 사진·접속·미리보기 틀에만 쓴다", () => {
    for (const name of ["img-src", "connect-src", "frame-src"]) expect(directive(prod, name)).toContain(SUPA);
    expect(prod).not.toContain("/rest/v1");
    expect(directive(prod, "script-src")).not.toContain("supabase");
    expect(directive(prod, "default-src")).toBe("default-src 'self'");
  });

  it("접속(connect-src)과 사진(img-src)은 아무 곳이나 허용하지 않는다 (토큰을 밖으로 빼돌리는 길 차단)", () => {
    for (const name of ["connect-src", "img-src", "frame-src"]) {
      const d = directive(prod, name);
      expect(d).not.toMatch(/(^|\s)\*(\s|$)/);
      expect(d).not.toMatch(/(^|\s)https?:(\s|$)/);
    }
    expect(directive(prod, "script-src")).not.toMatch(/https?:|data:|blob:|\*/);
  });

  it("개발 서버만 eval과 핫 리로드 접속을 허용한다", () => {
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toContain("ws://localhost:*");
    expect(dev).not.toContain("upgrade-insecure-requests");
    expect(directive(prod, "connect-src")).not.toContain("localhost");
  });

  it("Supabase 주소가 없으면 허용 목록에서 빠진다 (주소가 비어 있어도 깨지지 않는다)", () => {
    const none = buildCsp({});
    expect(none).not.toContain("supabase");
    expect(directive(none, "connect-src")).toBe("connect-src 'self'");
  });

  it("nonce가 있으면 스크립트는 nonce만 허용하고 unsafe-inline을 뺀다", () => {
    const nonce = "YWJjZGVmZ2hpamtsbW5vcA==";
    const csp = buildCsp({ supabaseUrl: SUPA, nonce });
    expect(directive(csp, "script-src")).toBe(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(buildCsp({ supabaseUrl: SUPA })).toContain("script-src 'self' 'unsafe-inline'");
  });

  it("nonce에 정책을 바꾸는 글자(세미콜론·공백·줄바꿈)가 있으면 거부한다", () => {
    expect(() => buildCsp({ nonce: "aaaaaaaaaaaaaaaa; script-src *" })).toThrow();
    expect(() => buildCsp({ nonce: "aaaaaaaaaaaaaaaa\nx" })).toThrow();
  });
});

describe("로그인 쿠키 설정 (lib/supabase/cookies.ts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  const load = async () => (await import("@/lib/supabase/cookies")).AUTH_COOKIE_OPTIONS;

  it("유효기간은 길어야 2주, SameSite=Lax, 사이트 전체 경로", async () => {
    const o = await load();
    expect(o.maxAge).toBeGreaterThan(0);
    expect(o.maxAge).toBeLessThanOrEqual(14 * 86_400);
    expect(o.sameSite).toBe("lax");
    expect(o.path).toBe("/");
  });

  it("운영에서는 Secure(https로만 전송), 개발 서버(http)에서는 끈다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    expect((await load()).secure).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    expect((await load()).secure).toBe(false);
  });
});
