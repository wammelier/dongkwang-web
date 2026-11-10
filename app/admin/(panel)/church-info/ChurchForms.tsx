"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useUnsavedWarning } from "@/components/admin/editor";
import { Input, ResultMessage, TextArea, type ActionResult } from "@/components/admin/fields";
import { saveChurchInfo, saveChurchList } from "@/lib/actions/church-info";
import { WEEKDAYS, type ChurchInfoTab, type ChurchInfoValues, type CommunityItem, type FaqItem, type ListTab } from "@/lib/church-info";
import { RepeatList, type FieldSpec } from "./RepeatList";

type TitleBody = { title: string; body: string };
const titleBodyFields: FieldSpec<TitleBody>[] = [
  { key: "title", label: "제목", required: true, wide: true },
  { key: "body", label: "내용", type: "textarea" },
];
const newTitleBody = (): TitleBody => ({ title: "", body: "" });

/** 저장 버튼 줄 (휴대폰에서는 화면 아래 고정) */
function SaveRow({ dirty, pending, onSave, onReset }: { dirty: boolean; pending: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-line bg-[#f6f7f4]/95 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur sm:px-8 lg:sticky lg:-mx-1 lg:rounded-card lg:border lg:px-4 lg:py-3">
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || pending}
        className="inline-flex h-11 items-center rounded-card bg-primary px-6 text-[15px] font-bold text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "저장 중…" : "저장"}
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={!dirty || pending}
        className="inline-flex h-11 items-center rounded-card border-[1.5px] border-line bg-white px-5 text-[15px] font-bold text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        되돌리기
      </button>
      <span className="text-sm text-ink-muted" aria-live="polite">{dirty ? "저장하지 않은 변경이 있습니다." : "변경 사항 없음"}</span>
    </div>
  );
}

/** 저장·되돌리기·오류 표시 공통 상태 */
function useForm<T>(initial: T, save: (value: T) => Promise<ActionResult>) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  useUnsavedWarning(dirty);

  const onSave = () =>
    startTransition(async () => {
      const res = await save(value);
      setResult(res);
      if (res.ok) {
        setSaved(value);
        router.refresh();
      } else {
        const first = Object.keys(res.fieldErrors ?? {})[0];
        if (first) requestAnimationFrame(() => document.getElementById(`f-${first}`)?.focus());
      }
    });
  const onReset = () => {
    setValue(saved);
    setResult(null);
  };
  return { value, setValue, result, errors: result?.fieldErrors ?? {}, pending, dirty, onSave, onReset };
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-card border border-line bg-white p-5 sm:p-6">
      {title && <h2 className="m-0 text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}

// ───────────────────────── 기본 정보 · 방문 안내 · 교회 소개
export function ChurchInfoForm<T extends ChurchInfoTab>({ tab, initial }: { tab: T; initial: ChurchInfoValues[T] }) {
  const f = useForm(initial as Record<string, unknown>, (v) => saveChurchInfo(tab, v));
  const v = f.value as Record<string, never>;
  const set = (key: string, value: unknown) => f.setValue((prev) => ({ ...prev, [key]: value }));
  const field = (key: string, label: string, opts: { hint?: string; type?: string; required?: boolean } = {}) => (
    <Input label={label} name={key} value={String(v[key] ?? "")} onChange={(x) => set(key, x)} error={f.errors[key]} {...opts} />
  );
  const area = (key: string, label: string, rows = 4, hint = "") => (
    <TextArea label={label} name={key} rows={rows} value={String(v[key] ?? "")} onChange={(x) => set(key, x)} error={f.errors[key]} hint={hint} />
  );

  return (
    <div className="flex flex-col gap-5 pb-24 lg:pb-0">
      <ResultMessage result={f.result} />

      {tab === "basic" && (
        <>
          <Card title="교회 이름·연락처">
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", "교회 이름", { required: true })}
              {field("name_en", "영문 이름")}
              {field("denomination", "교단")}
              {field("phone", "전화번호", { type: "tel" })}
            </div>
            {field("address", "주소", { hint: "하단 정보와 ‘오시는 길’에 보입니다" })}
            {field("office_hours", "사무실 시간", { hint: "예: 화–금 오전 10시–오후 5시" })}
            {field("map_url", "지도 링크", { type: "url", hint: "네이버·카카오 지도에서 ‘공유’로 받은 주소" })}
          </Card>
          <Card>
            <RepeatList<{ label: string; href: string }>
              name="channels"
              legend="공식 채널"
              hint="유튜브·인스타그램·블로그 등. 하단 정보에 보입니다."
              items={(v.channels ?? []) as { label: string; href: string }[]}
              onChange={(x) => set("channels", x)}
              fields={[
                { key: "label", label: "이름", required: true },
                { key: "href", label: "주소", type: "url" },
              ]}
              newItem={() => ({ label: "", href: "" })}
              itemTitle={(c) => c.label || "새 채널"}
              errors={f.errors}
              max={10}
              addLabel="+ 채널 추가"
            />
          </Card>
        </>
      )}

      {tab === "visit" && (
        <>
          <Card title="주차·교통">
            {field("parking_headline", "주차 요약", { hint: "예배 정보 줄에 보이는 짧은 문구 (예: 교회 앞 주차 가능)" })}
            {area("parking_detail", "주차 안내", 3)}
            {area("transit", "대중교통", 3)}
            {area("accessibility", "이동 편의", 3, "휠체어·엘리베이터·유아 동반 등")}
          </Card>
          <Card>
            <RepeatList<TitleBody>
              name="welcome_steps"
              legend="메인 ‘처음 오신 분’ 단계"
              items={(v.welcome_steps ?? []) as TitleBody[]}
              onChange={(x) => set("welcome_steps", x)}
              fields={titleBodyFields}
              newItem={newTitleBody}
              itemTitle={(s) => s.title || "새 단계"}
              errors={f.errors}
              max={6}
              addLabel="+ 단계 추가"
            />
          </Card>
          <Card>
            <RepeatList<TitleBody>
              name="visit_steps"
              legend="방문 안내 페이지 단계"
              items={(v.visit_steps ?? []) as TitleBody[]}
              onChange={(x) => set("visit_steps", x)}
              fields={titleBodyFields}
              newItem={newTitleBody}
              itemTitle={(s) => s.title || "새 단계"}
              errors={f.errors}
              max={8}
              addLabel="+ 단계 추가"
            />
          </Card>
        </>
      )}

      {tab === "about" && (
        <>
          <Card title="소개와 인사">
            {area("intro", "교회 소개", 4, "교회 소개 페이지 첫 문단")}
            {field("pastor_name", "담임목사 이름", { hint: "이름만 (‘목사’는 자동으로 붙음)" })}
            {area("pastor_greeting", "담임목사 인사말", 8)}
          </Card>
          <Card>
            <RepeatList<TitleBody>
              name="values"
              legend="신앙과 방향 (메인 ‘교회 소개’ 카드)"
              items={(v.values ?? []) as TitleBody[]}
              onChange={(x) => set("values", x)}
              fields={titleBodyFields}
              newItem={newTitleBody}
              itemTitle={(s) => s.title || "새 항목"}
              errors={f.errors}
              max={6}
            />
          </Card>
          <Card>
            <RepeatList<{ role: string; name: string }>
              name="staff"
              legend="섬기는 사람들"
              items={(v.staff ?? []) as { role: string; name: string }[]}
              onChange={(x) => set("staff", x)}
              fields={[
                { key: "role", label: "직분", required: true },
                { key: "name", label: "이름", required: true },
              ]}
              newItem={() => ({ role: "", name: "" })}
              itemTitle={(s) => [s.role, s.name].filter(Boolean).join(" ") || "새 사람"}
              errors={f.errors}
              max={30}
              addLabel="+ 사람 추가"
            />
          </Card>
          <Card>
            <RepeatList<{ year: string; text: string }>
              name="history"
              legend="연혁"
              hint="위에서부터 보이는 순서대로"
              items={(v.history ?? []) as { year: string; text: string }[]}
              onChange={(x) => set("history", x)}
              fields={[
                { key: "year", label: "연도", required: true, hint: "예: 1985" },
                { key: "text", label: "내용", required: true },
              ]}
              newItem={() => ({ year: "", text: "" })}
              itemTitle={(h) => [h.year, h.text].filter(Boolean).join(" · ") || "새 연혁"}
              errors={f.errors}
              max={50}
              addLabel="+ 연혁 추가"
            />
          </Card>
        </>
      )}

      <SaveRow dirty={f.dirty} pending={f.pending} onSave={f.onSave} onReset={f.onReset} />
    </div>
  );
}

// ───────────────────────── 예배 시간 · 공동체 · FAQ
/** 화면용 예배 시간 (요일은 select 값이라 문자열) */
export type WorshipFormItem = {
  id: string | null;
  name: string;
  target: string;
  weekday: string;
  start_time: string;
  place: string;
  is_online: boolean;
  is_main: boolean;
  is_active: boolean;
};

type ListItems = { worship: WorshipFormItem[]; groups: CommunityItem[]; faq: FaqItem[] };

export function ChurchListForm<T extends ListTab>({ tab, initial }: { tab: T; initial: ListItems[T] }) {
  const f = useForm(initial as ListItems[ListTab], (items) =>
    saveChurchList(
      tab,
      tab === "worship" ? (items as WorshipFormItem[]).map((w) => ({ ...w, weekday: Number(w.weekday) })) : items,
    ),
  );
  const errors = f.errors;

  return (
    <div className="flex flex-col gap-5 pb-24 lg:pb-0">
      <ResultMessage result={f.result} />
      <Card>
        {tab === "worship" && (
          <RepeatList<WorshipFormItem>
            name="items"
            legend="예배 시간"
            hint="‘대표 예배’ 하나가 메인 예배 정보 줄에 보입니다. 쉬는 예배는 ‘홈페이지에 보이기’를 끄세요."
            items={f.value as WorshipFormItem[]}
            onChange={(items) =>
              // 대표 예배는 하나만: 새로 켠 항목만 남긴다
              f.setValue((prev) => {
                const before = prev as WorshipFormItem[];
                const turnedOn = items.findIndex((w, i) => w.is_main && !before[i]?.is_main);
                return turnedOn === -1 ? items : items.map((w, i) => ({ ...w, is_main: i === turnedOn }));
              })
            }
            fields={[
              { key: "name", label: "예배 이름", required: true },
              { key: "target", label: "대상", hint: "예: 전 교인, 청소년" },
              { key: "weekday", label: "요일", type: "select", options: WEEKDAYS.map((d, i) => ({ value: String(i), label: d })) },
              { key: "start_time", label: "시작 시각", type: "time", required: true },
              { key: "place", label: "장소", wide: true },
              { key: "is_main", label: "대표 예배", type: "checkbox", hint: "메인에 크게 보임" },
              { key: "is_online", label: "온라인 예배", type: "checkbox" },
              { key: "is_active", label: "홈페이지에 보이기", type: "checkbox" },
            ]}
            newItem={() => ({ id: null, name: "", target: "", weekday: "0", start_time: "11:00", place: "", is_online: false, is_main: false, is_active: true })}
            itemTitle={(w) => w.name || "새 예배"}
            errors={errors}
            max={20}
            addLabel="+ 예배 추가"
          />
        )}
        {tab === "groups" && (
          <RepeatList<CommunityItem>
            name="items"
            legend="공동체"
            items={f.value as CommunityItem[]}
            onChange={(items) => f.setValue(items)}
            fields={[
              { key: "name", label: "모임 이름", required: true },
              { key: "target", label: "대상" },
              { key: "age_range", label: "나이", hint: "예: 초등" },
              { key: "meet_time", label: "모임 시간", hint: "예: 주일 11:00" },
              { key: "place", label: "장소" },
              { key: "contact", label: "문의", hint: "담당자나 연락 방법" },
              { key: "activities", label: "주요 활동", type: "textarea" },
              { key: "how_to_join", label: "처음 참여하는 방법", type: "textarea" },
              { key: "is_active", label: "홈페이지에 보이기", type: "checkbox" },
            ]}
            newItem={() => ({ id: null, slug: null, name: "", target: "", age_range: "", meet_time: "", place: "", activities: "", how_to_join: "", contact: "", is_active: true })}
            itemTitle={(c) => c.name || "새 공동체"}
            errors={errors}
            max={20}
            addLabel="+ 공동체 추가"
          />
        )}
        {tab === "faq" && (
          <RepeatList<FaqItem>
            name="items"
            legend="자주 묻는 질문"
            hint="방문 안내 페이지에 보입니다."
            items={f.value as FaqItem[]}
            onChange={(items) => f.setValue(items)}
            fields={[
              { key: "question", label: "질문", required: true, wide: true },
              { key: "answer", label: "답변", type: "textarea" },
              { key: "is_active", label: "홈페이지에 보이기", type: "checkbox" },
            ]}
            newItem={() => ({ id: null, question: "", answer: "", is_active: true })}
            itemTitle={(q) => q.question || "새 질문"}
            errors={errors}
            max={30}
            addLabel="+ 질문 추가"
          />
        )}
      </Card>
      <SaveRow dirty={f.dirty} pending={f.pending} onSave={f.onSave} onReset={f.onReset} />
    </div>
  );
}
