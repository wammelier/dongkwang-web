"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MetaBox, SaveBar, TrashedNotice, useUnsavedWarning } from "@/components/admin/editor";
import { Input, ResultMessage, TextArea, type ActionResult } from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/FileUpload";
import { PostStatusBadge } from "@/components/admin/PostStatusBadge";
import { saveBulletin } from "@/lib/actions/bulletins";
import { changeContentStatus } from "@/lib/actions/content";
import { suggestBulletinTitle, type BulletinDraft } from "@/lib/bulletins";
import { extOf, publicFileUrl } from "@/lib/files";
import { displayState, type SaveIntent } from "@/lib/posts";
import type { Status } from "@/lib/types";

type Meta = { status: Status; publishedAt: string | null; updatedAt: string } | null;

export function BulletinEditor({ id, initial, meta, created }: { id: string | null; initial: BulletinDraft; meta: Meta; created?: boolean }) {
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

  const set = <K extends keyof BulletinDraft>(key: K, value: BulletinDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  // 제목을 손대지 않았으면 날짜에 맞춰 제목 제안도 바꾼다
  const setDate = (date: string) =>
    setDraft((d) => ({ ...d, date, title: !d.title || d.title === suggestBulletinTitle(d.date) ? suggestBulletinTitle(date) : d.title }));

  const submit = (intent: SaveIntent) =>
    startTransition(async () => {
      const res = await saveBulletin(id, draft, intent);
      if (!res.ok) {
        setResult(res);
        const first = ["date", "title", "note", "filePath"].find((k) => res.fieldErrors?.[k]);
        if (first) requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus());
        return;
      }
      setSaved(draft);
      if (!id && res.id) {
        router.replace(`/admin/bulletins/${res.id}?created=1`);
        return;
      }
      setResult(res);
      router.refresh();
    });

  const trash = () => {
    if (dirty && !window.confirm("저장하지 않은 변경 사항이 있습니다. 그래도 휴지통으로 옮길까요?")) return;
    startTransition(async () => {
      const res = await changeContentStatus("bulletins", id!, "trash");
      if (res.ok) {
        setSaved(draft);
        router.push("/admin/bulletins?status=trashed");
      } else setResult(res);
    });
  };

  const restore = () =>
    startTransition(async () => {
      const res = await changeContentStatus("bulletins", id!, "restore");
      setResult(res);
      if (res.ok) router.refresh();
    });

  const fileUrl = draft.filePath ? publicFileUrl("bulletins", draft.filePath) : null;
  const isPdf = extOf(draft.filePath) === "pdf";

  return (
    <div className={`flex flex-col gap-5 ${trashed ? "" : "pb-28 lg:pb-0"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/bulletins" className="text-sm text-ink-muted hover:text-primary">← 목록</Link>
        {status && <PostStatusBadge state={displayState({ status, publish_start: null, publish_end: null })} />}
      </div>
      <ResultMessage result={result} />
      {trashed && <TrashedNotice what="주보" pending={pending} onRestore={restore} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <fieldset disabled={trashed} className="m-0 flex min-w-0 flex-col gap-5 rounded-card border border-line bg-white p-5 sm:p-6">
          <legend className="sr-only">주보 내용</legend>
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <Input label="날짜" name="date" type="date" required value={draft.date} onChange={setDate} error={errors.date} hint="보통 주일 날짜" />
            <Input label="제목" name="title" required value={draft.title} onChange={(v) => set("title", v)} error={errors.title} maxLength={80} />
          </div>
          <TextArea label="설명" name="note" rows={3} value={draft.note} onChange={(v) => set("note", v)} error={errors.note} hint="목록에 함께 보이는 한 줄 (선택)" />

          <div className="flex flex-col gap-3">
            <span id="f-filePath" tabIndex={-1} className="text-[15px] font-bold outline-none">
              주보 파일<span className="ml-1 text-[var(--danger)]" aria-hidden="true">*</span>
            </span>
            {fileUrl ? (
              <div className="flex flex-col gap-3">
                <div className="overflow-hidden rounded-card border border-line bg-[#fafaf8]">
                  {isPdf ? (
                    <iframe src={fileUrl} title="주보 미리보기" className="block h-[420px] w-full sm:h-[560px]" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- 저장소 원본을 그대로 미리 본다
                    <img src={fileUrl} alt="주보 미리보기" className="mx-auto block max-h-[560px] w-auto" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-[15px] font-medium">새 창에서 보기 ↗</a>
                  <FileUpload bucket="bulletins" folder="bulletins" label="다른 파일로 바꾸기" disabled={trashed} onUploaded={([f]) => set("filePath", f.path)} />
                  <button type="button" onClick={() => set("filePath", "")} className="h-11 text-sm text-ink-muted hover:text-[var(--danger)]">파일 빼기</button>
                </div>
              </div>
            ) : (
              <FileUpload bucket="bulletins" folder="bulletins" label="PDF 또는 사진 올리기" disabled={trashed} onUploaded={([f]) => set("filePath", f.path)} />
            )}
            {errors.filePath && <p className="m-0 text-sm text-[var(--danger)]">{errors.filePath}</p>}
            <p className="m-0 text-sm text-ink-muted">파일을 바꾸고 저장하면 이전 파일은 지워집니다.</p>
          </div>
        </fieldset>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          {meta && <MetaBox publishedAt={meta.publishedAt} updatedAt={meta.updatedAt} />}
          <SaveBar status={status} dirty={dirty} pending={pending} saved={Boolean(id)} onSubmit={submit} onTrash={trash} />
        </aside>
      </div>
    </div>
  );
}
