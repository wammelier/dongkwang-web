"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MetaBox, SaveBar, TrashedNotice, useUnsavedWarning } from "@/components/admin/editor";
import { Checkbox, Input, ResultMessage, TextArea } from "@/components/admin/fields";
import { PostStatusBadge } from "@/components/admin/PostStatusBadge";
import { PostFiles } from "./PostFiles";
import { PostArticle } from "@/components/PostArticle";
import { changeContentStatus } from "@/lib/actions/content";
import type { PostFile } from "@/lib/actions/post-files";
import { savePost, type PostSaveResult } from "@/lib/actions/posts";
import { publicFileUrl } from "@/lib/files";
import {
  fromSeoulInput,
  POST_TYPE_LABEL,
  POST_TYPES,
  type DisplayState,
  type PostDraft,
  type SaveIntent,
} from "@/lib/posts";
import type { Status } from "@/lib/types";

export type EditorMeta = {
  status: Status;
  state: DisplayState;
  publishedAt: string | null;
  updatedAt: string;
} | null;

type Result = Pick<PostSaveResult, "ok" | "message" | "fieldErrors">;

const same = (a: PostDraft, b: PostDraft) => JSON.stringify(a) === JSON.stringify(b);

/** 오류가 있는 첫 입력칸 순서 */
const FIELD_ORDER = ["type", "title", "summary", "body", "eventStart", "eventEnd", "eventPlace", "eventTarget", "applyUrl", "publishStart", "publishEnd"];

export function PostEditor({
  postId,
  initial,
  meta,
  notice,
  initialFiles = [],
}: {
  postId: string | null;
  initial: PostDraft;
  meta: EditorMeta;
  notice?: string;
  initialFiles?: PostFile[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [files, setFiles] = useState(initialFiles);
  const [result, setResult] = useState<Result | null>(notice ? { ok: true, message: notice } : null);
  const [pending, startTransition] = useTransition();
  const dirty = !same(draft, saved);
  const status = meta?.status ?? null;
  const trashed = status === "trashed";
  const errors = result?.fieldErrors ?? {};

  // 새 글 저장 후 붙은 ?saved=는 새로고침 때 다시 뜨지 않게 지운다
  useEffect(() => {
    if (notice) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [notice]);

  useUnsavedWarning(dirty);

  const set = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = (intent: SaveIntent) =>
    startTransition(async () => {
      const res = await savePost(postId, draft, intent);
      if (!res.ok) {
        setResult(res);
        const first = FIELD_ORDER.find((k) => res.fieldErrors?.[k]);
        if (first) {
          setTab("edit");
          requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus());
        }
        return;
      }
      setSaved(draft);
      if (!postId && res.id) {
        // 새 글: 편집 주소로 옮기고 결과는 다음 화면에서 보여 준다
        router.replace(`/admin/posts/${res.id}?saved=${res.state}`);
        return;
      }
      setResult(res);
      router.refresh();
    });

  const trash = () => {
    if (dirty && !window.confirm("저장하지 않은 변경 사항이 있습니다. 그래도 휴지통으로 옮길까요?")) return;
    startTransition(async () => {
      const res = await changeContentStatus("posts", postId!, "trash");
      if (res.ok) {
        setSaved(draft);
        router.push(`/admin/posts?status=trashed`);
      } else setResult(res);
    });
  };

  const restore = () =>
    startTransition(async () => {
      const res = await changeContentStatus("posts", postId!, "restore");
      setResult(res);
      if (res.ok) router.refresh();
    });

  const isEvent = draft.type === "event";
  const live = meta?.state === "live";

  return (
    <div className={`flex flex-col gap-5 ${trashed ? "" : "pb-28 lg:pb-0"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/posts" className="text-sm text-ink-muted hover:text-primary">
          ← 목록
        </Link>
        {meta && <PostStatusBadge state={meta.state} />}
        {live && postId && (
          <a href={`/news/${postId}`} target="_blank" rel="noopener" className="text-sm">
            홈페이지에서 보기 ↗
          </a>
        )}
      </div>

      <ResultMessage result={result} />

      {trashed && <TrashedNotice what="글" pending={pending} onRestore={restore} />}

      <div role="tablist" aria-label="보기" className="flex w-fit rounded-card border border-line bg-white p-1">
        {(["edit", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className={`h-9 rounded-[6px] px-4 text-[15px] font-bold ${tab === t ? "bg-primary text-on-primary" : "text-ink-muted hover:text-ink"}`}
          >
            {t === "edit" ? "편집" : "미리보기"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div id="panel-edit" role="tabpanel" hidden={tab !== "edit"}>
          <fieldset disabled={trashed} className="m-0 flex min-w-0 flex-col gap-5 rounded-card border border-line bg-white p-5 sm:p-6">
            <legend className="sr-only">글 내용</legend>
            <div className="flex flex-col gap-1.5">
              <span id="f-type-label" className="text-[15px] font-bold">종류</span>
              <div role="radiogroup" aria-labelledby="f-type-label" className="flex flex-wrap gap-2">
                {POST_TYPES.map((t) => (
                  <label
                    key={t}
                    className={`flex h-11 cursor-pointer items-center gap-2 rounded-card border-[1.5px] px-4 text-[15px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                      draft.type === t ? "border-primary bg-primary-soft font-bold text-primary" : "border-line"
                    }`}
                  >
                    <input
                      id={t === POST_TYPES[0] ? "f-type" : undefined}
                      type="radio"
                      name="type"
                      value={t}
                      checked={draft.type === t}
                      onChange={() => set("type", t)}
                      className="sr-only"
                    />
                    {POST_TYPE_LABEL[t]}
                  </label>
                ))}
              </div>
            </div>

            <Input label="제목" name="title" required value={draft.title} onChange={(v) => set("title", v)} error={errors.title} maxLength={120} />
            <Input
              label="요약"
              name="summary"
              value={draft.summary}
              onChange={(v) => set("summary", v)}
              error={errors.summary}
              hint="목록과 메인 카드에 보이는 한두 문장 (200자 이내)"
              maxLength={200}
            />
            <TextArea label="본문" name="body" value={draft.body} onChange={(v) => set("body", v)} error={errors.body} />

            {isEvent && (
              <fieldset className="m-0 flex flex-col gap-4 rounded-card bg-accent-soft p-4 sm:p-5">
                <legend className="float-left mb-1 text-[15px] font-bold">행사 정보</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="시작" name="eventStart" type="datetime-local" value={draft.eventStart} onChange={(v) => set("eventStart", v)} error={errors.eventStart} hint="게시하려면 필요해요" />
                  <Input label="종료" name="eventEnd" type="datetime-local" value={draft.eventEnd} onChange={(v) => set("eventEnd", v)} error={errors.eventEnd} hint="지나면 '지난 행사'로 표시" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="장소" name="eventPlace" value={draft.eventPlace} onChange={(v) => set("eventPlace", v)} error={errors.eventPlace} maxLength={100} />
                  <Input label="대상" name="eventTarget" value={draft.eventTarget} onChange={(v) => set("eventTarget", v)} error={errors.eventTarget} maxLength={100} />
                </div>
                <Input
                  label="신청 링크"
                  name="applyUrl"
                  type="url"
                  value={draft.applyUrl}
                  onChange={(v) => set("applyUrl", v)}
                  error={errors.applyUrl}
                  hint="구글 폼 등. 비우면 '신청 방법은 본문을 확인해 주세요'로 표시"
                />
              </fieldset>
            )}
          </fieldset>
          <div className="mt-5">
            <PostFiles postId={postId} files={files} onChange={setFiles} disabled={trashed} />
          </div>
        </div>

        <div id="panel-preview" role="tabpanel" hidden={tab !== "preview"} className="min-w-0">
          <div className="rounded-card border border-line bg-white">
            <p className="m-0 border-b border-line px-5 py-3 text-sm text-ink-muted">홈페이지 상세 화면에서 이렇게 보입니다.</p>
            <article className="flex flex-col gap-6 px-5 py-8 sm:px-8">
              <PostArticle
                post={{
                  id: postId ?? "preview",
                  type: draft.type,
                  title: draft.title || "(제목 없음)",
                  summary: draft.summary,
                  body: draft.body,
                  status: "published",
                  isPinned: draft.isPinned,
                  publishedAt: meta?.publishedAt ?? new Date().toISOString(),
                  eventStart: isEvent ? safeIso(draft.eventStart) : undefined,
                  eventEnd: isEvent ? safeIso(draft.eventEnd) : undefined,
                  eventPlace: isEvent ? draft.eventPlace || undefined : undefined,
                  eventTarget: isEvent ? draft.eventTarget || undefined : undefined,
                  applyUrl: isEvent ? draft.applyUrl || undefined : undefined,
                  // 홈페이지와 같게: 공개 동의한 사진과 첨부파일만
                  files: files
                    .filter((f) => f.kind === "attachment" || f.has_consent)
                    .map((f) => ({ kind: f.kind, name: f.name, size: f.size, url: publicFileUrl(f.kind === "image" ? "images" : "attachments", f.path) })),
                }}
              />
            </article>
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <fieldset disabled={trashed} className="m-0 flex flex-col gap-4 rounded-card border border-line bg-white p-5">
            <legend className="float-left text-[15px] font-bold">게시 설정</legend>
            <Checkbox label="중요 공지로 고정" hint="메인과 목록 맨 앞에 보입니다." checked={draft.isPinned} onChange={(v) => set("isPinned", v)} />
            <Input label="노출 시작" name="publishStart" type="datetime-local" value={draft.publishStart} onChange={(v) => set("publishStart", v)} error={errors.publishStart} hint="비우면 게시하는 즉시" />
            <Input label="노출 종료" name="publishEnd" type="datetime-local" value={draft.publishEnd} onChange={(v) => set("publishEnd", v)} error={errors.publishEnd} hint="비우면 계속 보입니다" />
            <p className="m-0 text-xs text-ink-muted">시각은 모두 한국 시간입니다.</p>
          </fieldset>

          {meta && <MetaBox publishedAt={meta.publishedAt} updatedAt={meta.updatedAt} />}
          <SaveBar status={status} dirty={dirty} pending={pending} saved={Boolean(postId)} onSubmit={submit} onTrash={trash} />
        </aside>
      </div>
    </div>
  );
}

function safeIso(value: string) {
  try {
    return fromSeoulInput(value) ?? undefined;
  } catch {
    return undefined;
  }
}
