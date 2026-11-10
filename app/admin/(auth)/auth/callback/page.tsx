"use client";

import { useEffect } from "react";
import { safeAdminPath } from "@/lib/auth-next";
import { createClient } from "@/lib/supabase/browser";

// Supabase 기본 메일(템플릿을 고치지 않은 상태)의 초대·재설정 링크가 도착하는 곳.
// 토큰이 주소의 # 뒤에 오므로 서버가 아니라 브라우저에서 세션을 만든다.
export default function AuthCallbackPage() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    // 주소창·방문 기록에 토큰이 남지 않게 바로 지운다
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (!accessToken || !refreshToken) {
      window.location.replace("/admin/login?reason=link-expired");
      return;
    }
    const type = hash.get("type");
    const fallback = type === "invite" || type === "recovery" ? "/admin/set-password" : "/admin";
    const next = safeAdminPath(new URLSearchParams(window.location.search).get("next"), fallback);

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => window.location.replace(error ? "/admin/login?reason=link-expired" : next));
  }, []);

  return (
    <p role="status" className="m-0 text-[15px] text-ink-muted">
      링크를 확인하는 중입니다…
    </p>
  );
}
