"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PostStatusBadge } from "@/components/admin/PostStatusBadge";
import type { ActionResult } from "@/components/admin/fields";
import { changeContentStatus } from "@/lib/actions/content";
import { formatDot } from "@/lib/date";
import { displayState, POST_TYPE_LABEL, type PostRow } from "@/lib/posts";

type Row = Pick<PostRow, "id" | "type" | "title" | "status" | "is_pinned" | "publish_start" | "publish_end" | "published_at" | "updated_at">;

export function PostList({ rows, trashView, canPurge, filtered }: { rows: Row[]; trashView: boolean; canPurge: boolean; filtered: boolean }) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (id: string, op: "restore" | "purge", title: string) => {
    if (op === "purge" && !window.confirm(`'${title}'을(를) 완전히 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      const res = await changeContentStatus("posts", id, op);
      setResult(res);
      if (res.ok) router.refresh();
    });
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line bg-white px-6 py-12 text-center">
        <p className="m-0 font-bold">{filtered ? "조건에 맞는 글이 없습니다." : trashView ? "휴지통이 비어 있습니다." : "아직 글이 없습니다."}</p>
        {!filtered && !trashView && (
          <p className="m-0 mt-1 text-[15px] text-ink-muted">
            <Link href="/admin/posts/new">첫 공지를 써 보세요 →</Link>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`m-0 rounded-card px-4 py-3 text-[15px] ${result.ok ? "bg-primary-soft text-primary" : "bg-[#fbeceb] text-[var(--danger)]"}`}>
          {result.message}
        </p>
      )}
      {trashView && (
        <p className="m-0 text-sm text-ink-muted">
          복구하면 임시 저장 상태로 돌아갑니다.{canPurge ? " 완전 삭제는 되돌릴 수 없습니다." : " 완전 삭제는 최고 관리자만 할 수 있습니다."}
        </p>
      )}
      <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-card border border-line bg-white p-0">
        <li aria-hidden="true" className="hidden grid-cols-[1fr_96px_88px_96px_120px] gap-4 bg-[#fafaf8] px-5 py-2.5 text-sm text-ink-muted md:grid">
          <span>제목</span>
          <span>종류</span>
          <span>상태</span>
          <span>게시일</span>
          <span>{trashView ? "" : "수정일"}</span>
        </li>
        {rows.map((r) => {
          const state = displayState(r);
          return (
            <li key={r.id} className="flex flex-col gap-2 px-4 py-3.5 sm:px-5 md:grid md:grid-cols-[1fr_96px_88px_96px_120px] md:items-center md:gap-4">
              <div className="flex min-w-0 items-start gap-2">
                {r.is_pinned && <span className="mt-0.5 flex-none rounded bg-[#fbeceb] px-1.5 text-xs font-bold text-[var(--danger)]">고정</span>}
                {trashView ? (
                  <span className="min-w-0 font-bold break-keep text-ink-muted">{r.title}</span>
                ) : (
                  <Link href={`/admin/posts/${r.id}`} className="min-w-0 font-bold break-keep text-ink hover:text-primary">
                    {r.title}
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted md:contents">
                <span>{POST_TYPE_LABEL[r.type]}</span>
                <span><PostStatusBadge state={state} /></span>
                <span>{r.published_at ? formatDot(r.published_at) : <span className="md:text-line">-</span>}</span>
                {trashView ? (
                  <span className="flex gap-1 md:justify-end">
                    <button type="button" disabled={pending} onClick={() => run(r.id, "restore", r.title)} className="h-9 rounded-card px-3 font-bold text-primary hover:bg-primary-soft disabled:opacity-50">
                      복구
                    </button>
                    {canPurge && (
                      <button type="button" disabled={pending} onClick={() => run(r.id, "purge", r.title)} className="h-9 rounded-card px-3 font-bold text-[var(--danger)] hover:bg-[#fbeceb] disabled:opacity-50">
                        완전 삭제
                      </button>
                    )}
                  </span>
                ) : (
                  <span><span className="md:hidden">수정 </span>{formatDot(r.updated_at)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
