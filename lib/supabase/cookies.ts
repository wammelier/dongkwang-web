// 로그인 쿠키 설정. 서버(server.ts)·proxy·브라우저(browser.ts)가 같은 값을 써야 서로 덮어쓰며 어긋나지 않는다.
// - secure: 운영(https)에서는 http로는 절대 보내지 않는다 (개발 서버는 http라 끔)
// - maxAge: 기본 400일은 너무 길다. 7일 동안 쓰지 않으면 다시 로그인 (사용 중에는 갱신될 때마다 7일씩 늘어난다)
// - httpOnly는 켜지 못한다: 파일 올리기가 브라우저에서 직접 이루어져 브라우저가 로그인 토큰을 읽어야 한다.
//   그래서 대신 CSP(lib/csp.ts)로 토큰을 밖으로 빼돌리는 길을 막는다.
export const AUTH_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};
