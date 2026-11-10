"use client";

import { useEffect } from "react";

// 대시보드에서 보낸 기본 초대 메일은 사이트 주소(홈)로 #access_token=…을 붙여 돌아온다.
// 어느 페이지에 도착하든 관리자 링크 처리 화면으로 넘긴다.
export function AuthHashRedirect() {
  useEffect(() => {
    const { hash, pathname } = window.location;
    if (pathname === "/admin/auth/callback") return;
    if (/[#&](access_token|error_code)=/.test(hash)) window.location.replace("/admin/auth/callback" + hash);
  }, []);
  return null;
}
