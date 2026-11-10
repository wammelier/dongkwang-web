/** 메일 링크의 next 값은 관리자 경로만 허용한다 (외부 주소로 보내는 열린 리다이렉트 방지) */
export function safeAdminPath(next: string | null | undefined, fallback = "/admin/set-password") {
  return next && /^\/admin(\/[\w\-/]*)?$/.test(next) ? next : fallback;
}
