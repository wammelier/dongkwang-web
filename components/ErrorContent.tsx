"use client";

import { useEffect } from "react";

/** 예상하지 못한 오류 화면. 원인은 서버 로그로 남기고 방문자에게는 다시 시도할 방법만 보여 준다 */
export function ErrorContent({ error, reset, home = "/" }: { error: Error & { digest?: string }; reset: () => void; home?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col items-start gap-4 px-5 py-24 sm:px-8">
      <p className="m-0 text-sm font-medium text-label">잠시 문제가 생겼습니다</p>
      <h1 className="m-0 text-[30px] leading-[1.3] font-bold break-keep">페이지를 불러오지 못했습니다</h1>
      <p className="m-0 break-keep text-ink-muted">
        잠시 후 다시 시도해 주세요. 계속되면 교회 사무실로 알려 주시면 고치겠습니다.
        {error.digest && <span className="mt-1 block text-sm">오류 번호: {error.digest}</span>}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center rounded-card bg-primary px-6 text-base font-bold text-on-primary hover:bg-primary-hover"
        >
          다시 시도
        </button>
        <a href={home} className="inline-flex h-12 items-center rounded-card border-[1.5px] border-line px-6 text-base font-bold text-ink hover:border-ink hover:text-ink">
          {home === "/" ? "메인으로" : "대시보드로"}
        </a>
      </div>
    </div>
  );
}
