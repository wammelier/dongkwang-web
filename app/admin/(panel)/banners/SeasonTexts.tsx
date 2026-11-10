"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input, ResultMessage, TextArea, type ActionResult } from "@/components/admin/fields";
import { resetSeasonText, saveSeasonText, setSeasonApplied } from "@/lib/actions/banners";
import { banners as defaults } from "@/lib/banners";
import { formatMonthDay } from "@/lib/date";
import type { BannerRow, ScheduleItem } from "@/lib/main-banner";
import type { SeasonKey } from "@/lib/season";

const lastDay = (end: string) => {
  const d = new Date(`${end}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/**
 * 올해 절기 일정, 절기별 '적용' 스위치, 문구.
 * 기본은 모두 꺼짐이다. 켠 절기만 해마다 그 날짜에 배너가 바뀌고, 켜지 않은 절기 날짜에는 연중 배너를 그대로 유지한다.
 */
export function SeasonTexts({
  year,
  schedule,
  rows,
  currentKey,
}: {
  year: number;
  schedule: ScheduleItem[];
  rows: BannerRow[];
  currentKey: SeasonKey;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SeasonKey | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  // 그 절기의 행: 게시본 우선, 없으면 가장 최근 것 (적용을 꺼도 고친 문구는 남아 있다)
  const rowOf = (key: SeasonKey) => {
    const mine = rows.filter((r) => r.season === key && r.status !== "trashed");
    return mine.find((r) => r.status === "published") ?? mine[0] ?? null;
  };
  const isApplied = (key: SeasonKey) => key === "ordinary" || rows.some((r) => r.season === key && r.status === "published");
  const appliedCount = schedule.filter((s, i, a) => s.key !== "ordinary" && isApplied(s.key) && a.findIndex((x) => x.key === s.key) === i).length;

  const run = (action: () => Promise<ActionResult>, closeEditor = false) =>
    startTransition(async () => {
      const res = await action();
      setResult(res);
      if (res.ok) {
        if (closeEditor) setEditing(null);
        router.refresh();
      }
    });

  const renderItem = (item: ScheduleItem) => {
    const row = rowOf(item.key);
    const text = row ?? defaults[item.key];
    const edited = Boolean(row && (row.title !== defaults[item.key].title || row.description !== defaults[item.key].description));
    const applied = isApplied(item.key);
    const base = item.key === "ordinary";
    return (
      <li key={`${item.key}-${item.start}`} className={`flex flex-col gap-3 px-4 py-4 sm:px-5 ${item.key === currentKey ? "bg-primary-soft/40" : ""}`}>
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-56">
            <p className="m-0 flex flex-wrap items-center gap-2 font-bold">
              {item.name}
              {item.key === currentKey && <span className="rounded bg-primary px-1.5 text-xs text-on-primary">지금</span>}
              <span className={`rounded px-1.5 text-xs font-bold ${applied ? "bg-primary-soft text-primary" : "bg-accent-soft text-ink-muted"}`}>
                {base ? "기본 · 항상" : applied ? "적용 중" : "적용 안 함"}
              </span>
              <span className={`rounded px-1.5 text-xs font-bold ${edited ? "bg-[#eaf3dc] text-[#3f6212]" : "bg-accent-soft text-ink-muted"}`}>
                {edited ? "고친 문구" : "기본 문구"}
              </span>
            </p>
            <p className="m-0 text-sm text-ink-muted">
              {formatMonthDay(item.start)} ~ {formatMonthDay(lastDay(item.end))}
            </p>
            <p className="m-0 mt-1 text-[15px] break-keep">{text.title.replace(/\n/g, " ")}</p>
            {!applied && <p className="m-0 mt-1 text-sm text-ink-muted">이 기간에는 연중 배너를 그대로 보여 줍니다.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!base && (
              <button
                type="button"
                role="switch"
                aria-checked={applied}
                aria-label={`${item.name} 배너 적용`}
                disabled={pending}
                onClick={() => run(() => setSeasonApplied(item.key, !applied))}
                className="flex h-11 items-center gap-2 disabled:opacity-60"
              >
                <span className={`relative h-6 w-11 flex-none rounded-full transition-colors ${applied ? "bg-primary" : "bg-[#cfd3cc]"}`}>
                  <span className={`absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow transition-transform ${applied ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                </span>
                <span className="w-16 text-left text-sm">{applied ? "적용 중" : "적용 안 함"}</span>
              </button>
            )}
            {editing !== item.key && (
              <button
                type="button"
                onClick={() => {
                  setEditing(item.key);
                  setResult(null);
                }}
                className="h-10 rounded-card border-[1.5px] border-line bg-white px-4 text-sm font-bold hover:border-ink"
              >
                문구 고치기
              </button>
            )}
          </div>
        </div>
        {editing === item.key && (
          <SeasonForm
            name={defaults[item.key].name}
            initial={{ title: text.title, description: text.description }}
            hasCustom={edited}
            pending={pending}
            errors={result?.fieldErrors ?? {}}
            onSave={(v) => run(() => saveSeasonText(item.key, v), true)}
            onReset={() => run(() => resetSeasonText(item.key), true)}
            onCancel={() => setEditing(null)}
          />
        )}
      </li>
    );
  };

  return (
    <section aria-labelledby="seasons" className="flex flex-col gap-4">
      <div>
        <h2 id="seasons" className="m-0 text-lg font-bold">{year}년 절기 배너</h2>
        <p className="m-0 mt-1 text-[15px] text-ink-muted">
          날짜는 부활절과 대림절을 기준으로 해마다 저절로 계산됩니다.
        </p>
      </div>

      <div className="rounded-card border border-line bg-white px-5 py-4">
        <p className="m-0 font-bold">
          절기에 맞춰 바꾸려면 <span className="text-primary">‘적용’ 스위치</span>를 켜세요
        </p>
        <ul className="m-0 mt-1.5 list-disc pl-5 text-[15px] text-ink-muted">
          <li>처음에는 <b>모든 절기가 ‘적용 안 함’</b>입니다. 지금 보이는 연중 배너가 그대로 유지됩니다.</li>
          <li>켠 절기만 <b>해마다 그 날짜에</b> 배너가 바뀝니다.</li>
          <li>켜지 않은 절기의 날짜에는 연중 배너를 계속 보여 줍니다.</li>
        </ul>
        <p className="m-0 mt-2 text-sm text-primary" aria-live="polite">
          {appliedCount === 0 ? "지금은 적용한 절기가 없습니다. 연중 배너를 계속 보여 줍니다." : `적용 중인 절기: ${appliedCount}개`}
        </p>
      </div>

      <ResultMessage result={result} />

      <ol className="m-0 list-none divide-y divide-line overflow-hidden rounded-card border border-line bg-white p-0">
        {schedule.map(renderItem)}
      </ol>
    </section>
  );
}

function SeasonForm({
  name,
  initial,
  hasCustom,
  pending,
  errors,
  onSave,
  onReset,
  onCancel,
}: {
  name: string;
  initial: { title: string; description: string };
  hasCustom: boolean;
  pending: boolean;
  errors: Record<string, string>;
  onSave: (v: { title: string; description: string }) => void;
  onReset: () => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-white p-4">
      <TextArea
        label={`${name} 헤드라인`}
        name="title"
        rows={2}
        value={v.title}
        onChange={(title) => setV({ ...v, title })}
        error={errors.title}
        hint="두 줄까지. 줄을 바꾸면 배너에서도 그 자리에서 줄이 바뀝니다."
        required
      />
      <Input label="짧은 설명" name="description" value={v.description} onChange={(description) => setV({ ...v, description })} error={errors.description} maxLength={120} />
      <p className="m-0 text-sm text-ink-muted">문구를 저장해도 ‘적용’ 여부는 바뀌지 않습니다.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => onSave(v)} className="h-11 rounded-card bg-primary px-5 text-[15px] font-bold text-on-primary hover:bg-primary-hover disabled:opacity-60">
          {pending ? "저장 중…" : "저장"}
        </button>
        <button type="button" disabled={pending} onClick={onCancel} className="h-11 rounded-card border-[1.5px] border-line bg-white px-5 text-[15px] font-bold hover:border-ink">
          취소
        </button>
        {hasCustom && (
          <button type="button" disabled={pending} onClick={onReset} className="h-11 px-3 text-sm text-ink-muted hover:text-[var(--danger)]">
            기본 문구로 되돌리기
          </button>
        )}
      </div>
    </div>
  );
}
