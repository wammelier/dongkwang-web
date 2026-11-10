"use client";

import { useEffect, useState, useTransition } from "react";
import { Input, ResultMessage, TextArea } from "@/components/admin/fields";
import { saveMainSections, saveSectionText, type SaveResult } from "@/lib/actions/main";
import { FIXED_SECTIONS, SECTION_INFO, SECTION_TEXT, sectionText, type SectionKey, type SectionSetting } from "@/lib/main-sections";

const same = (a: SectionSetting[], b: SectionSetting[]) =>
  a.length === b.length && a.every((s, i) => s.key === b[i].key && s.isVisible === b[i].isVisible);

export function SectionsEditor({ initial, canEdit }: { initial: SectionSetting[]; canEdit: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [items, setItems] = useState(initial);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [announce, setAnnounce] = useState("");
  const [pending, startTransition] = useTransition();
  const [textKey, setTextKey] = useState<SectionKey | null>(null);
  const dirty = !same(items, saved);

  // 저장하지 않고 나가려 하면 확인
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const update = (next: SectionSetting[]) => {
    setItems(next);
    setResult(null);
  };

  const move = (index: number, delta: -1 | 1) => {
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    update(next);
    setAnnounce(`${SECTION_INFO[next[to].key].label}을(를) ${to + 1}번째로 옮겼습니다.`);
  };

  const toggle = (index: number) => {
    const next = items.map((s, i) => (i === index ? { ...s, isVisible: !s.isVisible } : s));
    update(next);
    setAnnounce(`${SECTION_INFO[next[index].key].label} ${next[index].isVisible ? "켜짐" : "꺼짐"}`);
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveMainSections(items);
      setResult(res);
      if (res.ok) setSaved(items);
    });

  const visibleCount = items.filter((s) => s.isVisible).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-4">
        {!canEdit && (
          <p className="m-0 rounded-card bg-accent-soft px-4 py-3 text-[15px] text-ink-muted">
            구역 배치는 최고 관리자만 바꿀 수 있습니다. 현재 설정을 보여 드립니다.
          </p>
        )}

        <section aria-labelledby="fixed" className="rounded-card border border-line bg-white">
          <h2 id="fixed" className="m-0 border-b border-line px-5 py-3 text-sm font-medium text-ink-muted">
            맨 위 고정 구역 · 기획서 기준으로 항상 표시
          </h2>
          <ul className="m-0 list-none p-0">
            {FIXED_SECTIONS.map((name) => (
              <li key={name} className="flex items-center gap-3 px-5 py-3 text-[15px] text-ink-muted">
                <LockIcon />
                {name}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="movable" className="rounded-card border border-line bg-white">
          <h2 id="movable" className="m-0 border-b border-line px-5 py-3 text-sm font-medium text-ink-muted">
            그 아래 구역 · 켜기·끄기와 순서 변경
          </h2>
          <ol className="m-0 list-none divide-y divide-line p-0">
            {items.map((s, i) => {
              const info = SECTION_INFO[s.key];
              return (
                <li key={s.key} className={s.isVisible ? "" : "bg-[#fafaf8]"}>
                  <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
                  <span className="w-5 flex-none text-center text-sm font-bold text-ink-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`m-0 font-bold ${s.isVisible ? "" : "text-ink-muted line-through decoration-1"}`}>{info.label}</p>
                    <p className="m-0 text-[13px] leading-snug text-ink-muted">{info.description}</p>
                    {SECTION_TEXT[s.key] && (
                      <button
                        type="button"
                        onClick={() => setTextKey(textKey === s.key ? null : s.key)}
                        aria-expanded={textKey === s.key}
                        className="mt-1 text-[13px] font-medium text-primary"
                      >
                        {sectionText(s, s.key).headline.replace(/\n/g, " ")} · 문구 {canEdit ? "고치기" : "보기"}
                      </button>
                    )}
                  </div>
                  <Switch checked={s.isVisible} label={`${info.label} 보이기`} disabled={!canEdit} onChange={() => toggle(i)} />
                  <div className="flex flex-none flex-col sm:flex-row sm:gap-1">
                    <IconButton label={`${info.label} 위로`} disabled={!canEdit || i === 0} onClick={() => move(i, -1)}>
                      <path d="M6 15l6-6 6 6" />
                    </IconButton>
                    <IconButton
                      label={`${info.label} 아래로`}
                      disabled={!canEdit || i === items.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </IconButton>
                  </div>
                  </div>
                  {textKey === s.key && (
                    <SectionTextForm
                      sectionKey={s.key}
                      initial={{ headline: s.headline ?? "", body: s.body ?? "" }}
                      canEdit={canEdit}
                      onSaved={(t) => {
                        // 순서 저장과 별개로 바로 저장되므로 저장본·편집본 모두 갱신
                        const apply = (list: SectionSetting[]) => list.map((x) => (x.key === s.key ? { ...x, ...t } : x));
                        setItems(apply);
                        setSaved(apply);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <p aria-live="polite" className="sr-only">{announce}</p>

        {canEdit && (
          <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-line bg-[#f6f7f4]/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending}
              className="inline-flex h-11 items-center rounded-card bg-primary px-6 text-[15px] font-bold text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              onClick={() => update(saved)}
              disabled={!dirty || pending}
              className="inline-flex h-11 items-center rounded-card border-[1.5px] border-line px-5 text-[15px] font-bold text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              되돌리기
            </button>
            <span className="text-sm text-ink-muted">
              {dirty ? "저장하지 않은 변경이 있습니다." : result?.ok ? "" : "변경 사항 없음"}
            </span>
            {result && (
              <p role={result.ok ? "status" : "alert"} className={`m-0 w-full text-[15px] ${result.ok ? "text-primary" : "text-[var(--danger)]"}`}>
                {result.message}
              </p>
            )}
            {visibleCount === 0 && (
              <p className="m-0 w-full text-sm text-[var(--danger)]">모든 구역을 끄면 메인에는 고정 구역만 보입니다.</p>
            )}
          </div>
        )}
      </div>

      <Preview items={items} />
    </div>
  );
}

/** 저장 전 배치를 한눈에 보는 메인 페이지 축소도 */
function Preview({ items }: { items: SectionSetting[] }) {
  return (
    <aside aria-label="미리보기" className="lg:sticky lg:top-6 lg:self-start">
      <p className="m-0 mb-2 text-sm font-medium text-ink-muted">미리보기</p>
      <div className="flex flex-col gap-1.5 rounded-card border border-line bg-white p-3">
        <Block tone="fixed" height="h-6">메뉴</Block>
        <Block tone="fixed" height="h-14">{FIXED_SECTIONS[0]}</Block>
        <Block tone="fixed" height="h-8">{FIXED_SECTIONS[1]}</Block>
        {items.filter((s) => s.isVisible).map((s) => (
          <Block key={s.key} tone="section" height="h-10">{SECTION_INFO[s.key].label}</Block>
        ))}
        <Block tone="fixed" height="h-6">하단 정보</Block>
      </div>
      <a href="/" target="_blank" rel="noopener" className="mt-2 inline-block text-sm">
        저장된 홈페이지 열기 ↗
      </a>
    </aside>
  );
}

function Block({ tone, height, children }: { tone: "fixed" | "section"; height: string; children: React.ReactNode }) {
  return (
    <div
      className={`flex ${height} items-center justify-center rounded text-xs font-medium ${
        tone === "fixed" ? "bg-accent-soft text-ink-muted" : "border border-primary/30 bg-primary-soft text-primary"
      }`}
    >
      {children}
    </div>
  );
}

function Switch({ checked, label, disabled, onChange }: { checked: boolean; label: string; disabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="flex h-11 flex-none items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-[#cfd3cc]"}`}>
        <span
          className={`absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </span>
      <span className="hidden w-7 text-left text-sm text-ink-muted sm:inline">{checked ? "켜짐" : "꺼짐"}</span>
    </button>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-card text-ink hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-30 sm:h-11 sm:w-11"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** 구역 제목·소개 문구 (비우면 기본 문구). 순서 저장과 별개로 바로 저장한다 */
function SectionTextForm({
  sectionKey,
  initial,
  canEdit,
  onSaved,
}: {
  sectionKey: SectionKey;
  initial: { headline: string; body: string };
  canEdit: boolean;
  onSaved: (t: { headline: string; body: string }) => void;
}) {
  const [v, setV] = useState(initial);
  const [result, setResult] = useState<(SaveResult & { fieldErrors?: Record<string, string> }) | null>(null);
  const [pending, startTransition] = useTransition();
  const fallback = SECTION_TEXT[sectionKey]!;
  const save = (next: { headline: string; body: string }) =>
    startTransition(async () => {
      const res = await saveSectionText(sectionKey, next);
      setResult(res);
      if (res.ok) {
        setV(next);
        onSaved(next);
      }
    });

  return (
    <fieldset disabled={!canEdit || pending} className="m-0 mx-4 mb-4 flex flex-col gap-3 rounded-card border border-line bg-white p-4 sm:mx-5">
      <legend className="sr-only">{SECTION_INFO[sectionKey].label} 문구</legend>
      <ResultMessage result={result} />
      <TextArea
        label="제목"
        name={`${sectionKey}-headline`}
        rows={2}
        value={v.headline}
        onChange={(headline) => setV({ ...v, headline })}
        error={result?.fieldErrors?.headline}
        hint={`비우면 기본: ${fallback.headline.replace(/\n/g, " / ")}`}
      />
      <Input
        label="소개 문구"
        name={`${sectionKey}-body`}
        value={v.body}
        onChange={(body) => setV({ ...v, body })}
        error={result?.fieldErrors?.body}
        hint={fallback.body ? `비우면 기본: ${fallback.body}` : "제목 아래 한 줄 (선택)"}
        maxLength={200}
      />
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => save(v)} className="h-10 rounded-card bg-primary px-4 text-sm font-bold text-on-primary hover:bg-primary-hover disabled:opacity-60">
            {pending ? "저장 중…" : "문구 저장"}
          </button>
          {(initial.headline || initial.body) && (
            <button type="button" onClick={() => save({ headline: "", body: "" })} className="h-10 px-3 text-sm text-ink-muted hover:text-[var(--danger)]">
              기본 문구로
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}
