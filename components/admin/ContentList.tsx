"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ResultMessage, type ActionResult } from "@/components/admin/fields";
import { PostStatusBadge } from "@/components/admin/PostStatusBadge";
import { changeContentStatus, type ContentTable } from "@/lib/actions/content";
import type { DisplayState } from "@/lib/posts";

export type ContentItem = { id: string; title: string; sub: string; state: DisplayState; href: string; flag?: string };

/** 주보·설교 목록 (휴지통 보기에서는 복구·완전 삭제) */
export function ContentList({
  table,
  items,
  trashView,
  canPurge,
  empty,
}: {
  table: ContentTable;
  items: ContentItem[];
  trashView: boolean;
  canPurge: boolean;
  empty: React.ReactNode;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (id: string, op: "restore" | "purge", title: string) => {
    if (op === "purge" && !window.confirm(`'${title}'을(를) 완전히 삭제할까요?\n올린 파일도 함께 지워지고 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      const res = await changeContentStatus(table, id, op);
      setResult(res);
      if (res.ok) router.refresh();
    });
  };

  if (items.length === 0) {
    return <div className="rounded-card border border-dashed border-line bg-white px-6 py-12 text-center">{empty}</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ResultMessage result={result} />
      {trashView && (
        <p className="m-0 text-sm text-ink-muted">
          복구하면 임시 저장 상태로 돌아갑니다.{canPurge ? " 완전 삭제는 되돌릴 수 없습니다." : " 완전 삭제는 최고 관리자만 할 수 있습니다."}
        </p>
      )}
      <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-card border border-line bg-white p-0">
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 flex-1 basis-60 flex-col gap-0.5">
              {trashView ? (
                <span className="font-bold break-keep text-ink-muted">{i.title}</span>
              ) : (
                <Link href={i.href} className="font-bold break-keep text-ink hover:text-primary">{i.title}</Link>
              )}
              <span className="text-sm text-ink-muted">{i.sub}</span>
            </div>
            {i.flag && <span className="text-sm text-[#9a4d00]">{i.flag}</span>}
            <PostStatusBadge state={i.state} />
            {trashView && (
              <span className="flex gap-1">
                <button type="button" disabled={pending} onClick={() => run(i.id, "restore", i.title)} className="h-9 rounded-card px-3 text-sm font-bold text-primary hover:bg-primary-soft disabled:opacity-50">
                  복구
                </button>
                {canPurge && (
                  <button type="button" disabled={pending} onClick={() => run(i.id, "purge", i.title)} className="h-9 rounded-card px-3 text-sm font-bold text-[var(--danger)] hover:bg-[#fbeceb] disabled:opacity-50">
                    완전 삭제
                  </button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 목록 위 탭: 전체 / 휴지통 */
export function TrashTabs({ base, trashView, counts }: { base: string; trashView: boolean; counts: { all: number; trashed: number } }) {
  const tabs = [
    { href: base, label: "전체", n: counts.all, active: !trashView },
    { href: `${base}?status=trashed`, label: "휴지통", n: counts.trashed, active: trashView },
  ];
  return (
    <nav aria-label="보기">
      <ul className="m-0 flex list-none gap-1 border-b border-line p-0">
        {tabs.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={`-mb-px flex h-11 items-center gap-1.5 border-b-2 px-3 text-[15px] ${
                t.active ? "border-primary font-bold text-primary" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {t.label} <span className="text-sm font-normal">{t.n}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function NewButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-11 items-center rounded-card bg-primary px-5 text-[15px] font-bold text-on-primary hover:bg-primary-hover hover:text-on-primary">
      {children}
    </Link>
  );
}
