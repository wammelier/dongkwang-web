"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MetaBox, SaveBar, TrashedNotice, useUnsavedWarning } from "@/components/admin/editor";
import { Input, ResultMessage, TextArea, type ActionResult } from "@/components/admin/fields";
import { PostStatusBadge } from "@/components/admin/PostStatusBadge";
import { changeContentStatus } from "@/lib/actions/content";
import { saveSermon } from "@/lib/actions/sermons";
import { formatLong } from "@/lib/date";
import { displayState, type SaveIntent } from "@/lib/posts";
import { preacherLabel, type SermonDraft } from "@/lib/sermons";
import type { Status } from "@/lib/types";

type Meta = { status: Status; publishedAt: string | null; updatedAt: string } | null;

const FIELD_ORDER = ["title", "preachedOn", "scripture", "preacher", "videoUrl", "summary"];

export function SermonEditor({ id, initial, meta, created }: { id: string | null; initial: SermonDraft; meta: Meta; created?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [result, setResult] = useState<ActionResult | null>(
    created ? { ok: true, message: meta?.status === "published" ? "게시했습니다. 홈페이지에 바로 보입니다." : "임시 저장했습니다." } : null,
  );
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const status = meta?.status ?? null;
  const trashed = status === "trashed";
  const errors = result?.fieldErrors ?? {};
  useUnsavedWarning(dirty);

  useEffect(() => {
    if (created) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [created]);

  const set = <K extends keyof SermonDraft>(key: K, value: SermonDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = (intent: SaveIntent) =>
    startTransition(async () => {
      const res = await saveSermon(id, draft, intent);
      if (!res.ok) {
        setResult(res);
        const first = FIELD_ORDER.find((k) => res.fieldErrors?.[k]);
        if (first) requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus());
        return;
      }
      setSaved(draft);
      if (!id && res.id) {
        router.replace(`/admin/sermons/${res.id}?created=1`);
        return;
      }
      setResult(res);
      router.refresh();
    });

  const trash = () => {
    if (dirty && !window.confirm("저장하지 않은 변경 사항이 있습니다. 그래도 휴지통으로 옮길까요?")) return;
    startTransition(async () => {
      const res = await changeContentStatus("sermons", id!, "trash");
      if (res.ok) {
        setSaved(draft);
        router.push("/admin/sermons?status=trashed");
      } else setResult(res);
    });
  };

  const restore = () =>
    startTransition(async () => {
      const res = await changeContentStatus("sermons", id!, "restore");
      setResult(res);
      if (res.ok) router.refresh();
    });

  return (
    <div className={`flex flex-col gap-5 ${trashed ? "" : "pb-28 lg:pb-0"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/sermons" className="text-sm text-ink-muted hover:text-primary">← 목록</Link>
        {status && <PostStatusBadge state={displayState({ status, publish_start: null, publish_end: null })} />}
        {status === "published" && id && (
          <a href={`/sermons/${id}`} target="_blank" rel="noopener" className="text-sm">홈페이지에서 보기 ↗</a>
        )}
      </div>
      <ResultMessage result={result} />
      {trashed && <TrashedNotice what="설교" pending={pending} onRestore={restore} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <fieldset disabled={trashed} className="m-0 flex min-w-0 flex-col gap-5 rounded-card border border-line bg-white p-5 sm:p-6">
            <legend className="sr-only">설교 내용</legend>
            <Input label="제목" name="title" required value={draft.title} onChange={(v) => set("title", v)} error={errors.title} maxLength={120} />
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <Input label="설교 날짜" name="preachedOn" type="date" required value={draft.preachedOn} onChange={(v) => set("preachedOn", v)} error={errors.preachedOn} />
              <Input label="본문" name="scripture" value={draft.scripture} onChange={(v) => set("scripture", v)} error={errors.scripture} hint="예: 요한일서 4:7–12" maxLength={80} />
            </div>
            <Input
              label="설교자"
              name="preacher"
              value={draft.preacher}
              onChange={(v) => set("preacher", v)}
              error={errors.preacher}
              hint="이름만 쓰면 ‘목사’가 붙습니다. 다른 직함은 함께 써 주세요 (예: 김철수 선교사)"
              maxLength={40}
            />
            <Input
              label="영상 링크"
              name="videoUrl"
              type="url"
              value={draft.videoUrl}
              onChange={(v) => set("videoUrl", v)}
              error={errors.videoUrl}
              hint="유튜브 등 영상 주소. 비우면 ‘영상 링크 등록 전’으로 보입니다"
            />
            <TextArea label="요약" name="summary" rows={6} value={draft.summary} onChange={(v) => set("summary", v)} error={errors.summary} hint="메인 ‘최근 말씀’과 상세 화면에 보입니다" />
          </fieldset>

          <section aria-label="미리보기" className="rounded-card border border-line bg-white">
            <p className="m-0 border-b border-line px-5 py-3 text-sm text-ink-muted">미리보기 · 홈페이지 상세 화면 윗부분</p>
            <div className="flex flex-col gap-2 px-5 py-6 sm:px-8">
              <p className="m-0 text-sm font-medium text-label">{draft.preachedOn ? formatLong(draft.preachedOn) : "날짜 없음"}</p>
              <p className="m-0 text-[26px] leading-[1.3] font-bold break-keep">{draft.title || "(제목 없음)"}</p>
              <p className="m-0 text-ink-muted">{[draft.scripture, preacherLabel(draft.preacher)].filter(Boolean).join(" · ")}</p>
              {draft.summary && <p className="m-0 mt-2 whitespace-pre-line">{draft.summary}</p>}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          {meta && <MetaBox publishedAt={meta.publishedAt} updatedAt={meta.updatedAt} />}
          <SaveBar status={status} dirty={dirty} pending={pending} saved={Boolean(id)} onSubmit={submit} onTrash={trash} />
        </aside>
      </div>
    </div>
  );
}
