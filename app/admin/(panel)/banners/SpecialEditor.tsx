"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BannerView } from "@/components/BannerView";
import { MetaBox, SaveBar, TrashedNotice, useUnsavedWarning } from "@/components/admin/editor";
import { Input, ResultMessage, TextArea, type ActionResult } from "@/components/admin/fields";
import { PostStatusBadge } from "@/components/admin/PostStatusBadge";
import { saveSpecialBanner } from "@/lib/actions/banners";
import { changeContentStatus } from "@/lib/actions/content";
import type { SpecialDraft } from "@/lib/banner-admin";
import { formatDot, formatTime } from "@/lib/date";
import { coveredSeasons, IMPORTANT_SEASONS, overlappingSpecials, type BannerRow } from "@/lib/main-banner";
import { displayState, fromSeoulInput, type SaveIntent } from "@/lib/posts";
import type { Status } from "@/lib/types";

type Meta = { status: Status; publishStart: string | null; publishEnd: string | null; publishedAt: string | null; updatedAt: string } | null;

const FIELD_ORDER = ["eyebrow", "title", "description", "primaryLabel", "primaryHref", "publishStart", "publishEnd"];

const safeIso = (v: string) => {
  try {
    return fromSeoulInput(v);
  } catch {
    return null;
  }
};

export function SpecialEditor({
  id,
  initial,
  meta,
  others,
  seasons,
  created,
}: {
  id: string | null;
  initial: SpecialDraft;
  meta: Meta;
  /** 게시 중인 다른 특별 배너 (겹침 미리 알림) */
  others: BannerRow[];
  /** 게시 중인 절기 행 (켜 둔 절기만 가려지는 절기로 센다) */
  seasons: BannerRow[];
  created?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [mobile, setMobile] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(created ? { ok: true, message: "저장했습니다." } : null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const status = meta?.status ?? null;
  const trashed = status === "trashed";
  const errors = result?.fieldErrors ?? {};
  useUnsavedWarning(dirty);

  useEffect(() => {
    if (created) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [created]);

  const set = <K extends keyof SpecialDraft>(key: K, value: SpecialDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = (intent: SaveIntent) =>
    startTransition(async () => {
      const res = await saveSpecialBanner(id, draft, intent);
      if (!res.ok) {
        setResult(res);
        const first = FIELD_ORDER.find((k) => res.fieldErrors?.[k]);
        if (first) requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus());
        return;
      }
      setSaved(draft);
      if (!id && res.id) {
        router.replace(`/admin/banners/special/${res.id}?created=1`);
        return;
      }
      setResult(res);
      router.refresh();
    });

  const trash = () => {
    if (dirty && !window.confirm("저장하지 않은 변경 사항이 있습니다. 그래도 휴지통으로 옮길까요?")) return;
    startTransition(async () => {
      const res = await changeContentStatus("main_banners", id!, "trash");
      if (res.ok) {
        setSaved(draft);
        router.push("/admin/banners?status=trashed");
      } else setResult(res);
    });
  };

  const restore = () =>
    startTransition(async () => {
      const res = await changeContentStatus("main_banners", id!, "restore");
      setResult(res);
      if (res.ok) router.refresh();
    });

  // 기간에 따른 안내: 가려지는 절기, 겹치는 특별 배너
  const start = safeIso(draft.publishStart);
  const end = safeIso(draft.publishEnd);
  const windowOk = end && (!start || end > start);
  const covered = windowOk ? coveredSeasons(seasons, start, end) : [];
  const important = covered.filter((n) => IMPORTANT_SEASONS.includes(n));
  const clash = windowOk ? overlappingSpecials(others, { id, publish_start: start, publish_end: end }) : [];

  return (
    <div className={`flex flex-col gap-5 ${trashed ? "" : "pb-28 lg:pb-0"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/banners" className="text-sm text-ink-muted hover:text-primary">← 절기 배너</Link>
        {meta && <PostStatusBadge state={displayState({ status: meta.status, publish_start: meta.publishStart, publish_end: meta.publishEnd })} />}
      </div>
      <ResultMessage result={result} />
      {trashed && <TrashedNotice what="배너" pending={pending} onRestore={restore} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <fieldset disabled={trashed} className="m-0 flex min-w-0 flex-col gap-5 rounded-card border border-line bg-white p-5 sm:p-6">
            <legend className="sr-only">배너 내용</legend>
            <Input label="작은 제목" name="eyebrow" value={draft.eyebrow} onChange={(v) => set("eyebrow", v)} error={errors.eyebrow} hint="헤드라인 위 한 줄. 비우면 ‘교회 소식’" maxLength={30} />
            <TextArea label="헤드라인" name="title" rows={2} value={draft.title} onChange={(v) => set("title", v)} error={errors.title} hint="두 줄까지. 연도나 예배 시간은 확정된 것만 넣어 주세요." required />
            <Input label="짧은 설명" name="description" value={draft.description} onChange={(v) => set("description", v)} error={errors.description} maxLength={120} />
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Input label="버튼 글자" name="primaryLabel" value={draft.primaryLabel} onChange={(v) => set("primaryLabel", v)} error={errors.primaryLabel} hint="예: 행사 안내" maxLength={12} />
              <Input
                label="버튼 주소"
                name="primaryHref"
                value={draft.primaryHref}
                onChange={(v) => set("primaryHref", v)}
                error={errors.primaryHref}
                hint="사이트 안이면 /news/… 처럼, 밖이면 https://…  비우면 기본 버튼만"
              />
            </div>
          </fieldset>

          <fieldset disabled={trashed} className="m-0 flex flex-col gap-4 rounded-card border border-line bg-white p-5 sm:p-6">
            <legend className="float-left text-[15px] font-bold">보이는 기간</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="시작" name="publishStart" type="datetime-local" value={draft.publishStart} onChange={(v) => set("publishStart", v)} error={errors.publishStart} hint="비우면 게시하는 즉시" />
              <Input label="끝" name="publishEnd" type="datetime-local" required value={draft.publishEnd} onChange={(v) => set("publishEnd", v)} error={errors.publishEnd} hint="꼭 필요합니다. 끝나면 그때의 절기 배너로 돌아갑니다" />
            </div>
            <p className="m-0 text-xs text-ink-muted">시각은 모두 한국 시간입니다.</p>
            {covered.length > 0 && (
              <p className={`m-0 rounded-card px-4 py-3 text-sm ${important.length ? "bg-[#fdf1e3] text-[#9a4d00]" : "bg-accent-soft text-ink"}`}>
                이 기간에는 <b>{covered.join(", ")}</b> 배너 대신 이 배너가 보입니다.
                {important.length > 0 && ` ${important.join("·")}처럼 중요한 절기와 겹칩니다. 정말 이 기간에 걸지 확인해 주세요.`}
              </p>
            )}
            {clash.length > 0 && (
              <p role="alert" className="m-0 rounded-card bg-[#fbeceb] px-4 py-3 text-sm text-[var(--danger)]">
                게시 중인 다른 특별 배너와 기간이 겹쳐 게시할 수 없습니다:{" "}
                {clash.map((r) => `‘${r.title.replace(/\n/g, " ")}’ (~${formatDot(r.publish_end!)} ${formatTime(r.publish_end!)})`).join(", ")}
              </p>
            )}
          </fieldset>

          <section aria-labelledby="sp-preview" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="sp-preview" className="m-0 text-[15px] font-bold">미리보기</h2>
              <div role="radiogroup" aria-label="화면 크기" className="flex rounded-card border border-line bg-white p-1">
                {[
                  { v: false, label: "PC" },
                  { v: true, label: "휴대폰" },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    role="radio"
                    aria-checked={mobile === o.v}
                    onClick={() => setMobile(o.v)}
                    className={`h-9 rounded-[6px] px-3 text-sm font-bold ${mobile === o.v ? "bg-primary text-on-primary" : "text-ink-muted hover:text-ink"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={`overflow-hidden rounded-card border border-line ${mobile ? "mx-auto w-full max-w-[375px]" : ""}`}>
              <BannerView
                preview
                mobile={mobile}
                banner={{
                  eyebrow: draft.eyebrow.trim() || "교회 소식",
                  title: draft.title || "(헤드라인)",
                  description: draft.description,
                  primary: draft.primaryLabel && draft.primaryHref ? { label: draft.primaryLabel, href: draft.primaryHref } : null,
                }}
              />
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
