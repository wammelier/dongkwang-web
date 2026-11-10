"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 페이지를 열어 둔 채 절기 전환 시각을 넘기거나, 다시 화면으로 돌아왔을 때 서버 배너를 다시 받는다 (기획서 15.5)
// 판단은 서버가 하므로 방문자 기기 시계가 틀려도 잘못된 절기를 보여주지 않는다.
const MAX_DELAY = 6 * 60 * 60 * 1000;

export function SeasonWatcher({ nextChangeAt }: { nextChangeAt: string }) {
  const router = useRouter();

  useEffect(() => {
    const delay = new Date(nextChangeAt).getTime() - Date.now() + 1000;
    const timer = setTimeout(() => router.refresh(), Math.min(Math.max(delay, 60_000), MAX_DELAY));

    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [nextChangeAt, router]);

  return null;
}
