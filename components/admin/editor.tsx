"use client";

// 글·주보·설교 편집 화면이 함께 쓰는 저장 막대와 상태 표시
import { useEffect } from "react";
import { formatDot, formatTime } from "@/lib/date";
import type { SaveIntent } from "@/lib/posts";
import type { Status } from "@/lib/types";

/** 저장하지 않고 나가려 하면 확인 */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

/** 상태마다 주 버튼 하나 + 보조 버튼 */
function buttonsFor(status: Status | null): { intent: SaveIntent; label: string; primary?: boolean }[] {
  if (status === "published") {
    return [
      { intent: "save", label: "저장", primary: true },
      { intent: "unpublish", label: "게시 중단" },
    ];
  }
  if (status === "unpublished") {
    return [
      { intent: "publish", label: "다시 게시", primary: true },
      { intent: "save", label: "저장" },
    ];
  }
  return [
    { intent: "publish", label: "게시하기", primary: true },
    { intent: "draft", label: "임시 저장" },
  ];
}

export function SaveBar({
  status,
  dirty,
  pending,
  saved,
  onSubmit,
  onTrash,
}: {
  status: Status | null;
  dirty: boolean;
  pending: boolean;
  /** 이미 저장된 항목인지 (새 항목이면 휴지통 버튼·저장 완료 문구를 숨김) */
  saved: boolean;
  onSubmit: (intent: SaveIntent) => void;
  onTrash: () => void;
}) {
  if (status === "trashed") return null;
  return (
    <>
      {/* 휴대폰에서는 화면 아래에 늘 떠 있는 저장 막대 */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-1.5 border-t border-line bg-[#f6f7f4]/95 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur sm:px-8 lg:static lg:z-auto lg:gap-2 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="flex gap-2 lg:flex-col">
          {buttonsFor(status).map((b) => (
            <button
              key={b.intent}
              type="button"
              onClick={() => onSubmit(b.intent)}
              disabled={pending}
              className={`inline-flex h-11 flex-1 items-center justify-center rounded-card px-5 text-[15px] font-bold disabled:cursor-wait disabled:opacity-60 ${
                b.primary ? "bg-primary text-on-primary hover:bg-primary-hover" : "border-[1.5px] border-line bg-white text-ink hover:border-ink"
              }`}
            >
              {pending ? "처리 중…" : b.label}
            </button>
          ))}
        </div>
        <p className="m-0 text-center text-xs text-ink-muted lg:text-left" aria-live="polite">
          {dirty ? "저장하지 않은 변경이 있습니다." : saved ? "모든 변경이 저장되었습니다." : ""}
        </p>
      </div>
      {saved && (
        <button type="button" onClick={onTrash} disabled={pending} className="h-11 self-start text-sm text-ink-muted hover:text-[var(--danger)]">
          휴지통으로 옮기기
        </button>
      )}
    </>
  );
}

export function TrashedNotice({ what, pending, onRestore }: { what: string; pending: boolean; onRestore: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white px-5 py-4">
      <p className="m-0 flex-1 text-[15px]">휴지통에 있는 {what}입니다. 복구하면 임시 저장 상태로 돌아가 다시 고칠 수 있습니다.</p>
      <button type="button" onClick={onRestore} disabled={pending} className="h-11 rounded-card bg-primary px-5 text-[15px] font-bold text-on-primary hover:bg-primary-hover disabled:opacity-50">
        복구
      </button>
    </div>
  );
}

export function MetaBox({ publishedAt, updatedAt }: { publishedAt: string | null; updatedAt: string }) {
  return (
    <dl className="m-0 grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 rounded-card border border-line bg-white p-5 text-sm">
      <dt className="text-ink-muted">게시일</dt>
      <dd className="m-0">{publishedAt ? formatDot(publishedAt) : "아직 게시 전"}</dd>
      <dt className="text-ink-muted">수정</dt>
      <dd className="m-0">
        {formatDot(updatedAt)} {formatTime(updatedAt)}
      </dd>
    </dl>
  );
}
