"use client";

import { Checkbox, Input, Select, TextArea } from "@/components/admin/fields";

export type FieldSpec<T> = {
  key: keyof T & string;
  label: string;
  type?: "text" | "textarea" | "url" | "time" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  hint?: string;
  required?: boolean;
  /** 두 칸 너비 차지 */
  wide?: boolean;
};

/**
 * 항목 목록 편집: 추가·삭제·위아래 이동. 끌어다 놓기 대신 버튼이라 휴대폰·키보드로도 쓸 수 있다.
 * 오류는 "<name>.<번호>.<칸>" 이름으로 받는다.
 */
export function RepeatList<T extends Record<string, unknown>>({
  name,
  legend,
  items,
  onChange,
  fields,
  newItem,
  itemTitle,
  errors,
  max,
  addLabel = "+ 항목 추가",
  hint,
}: {
  name: string;
  legend: string;
  items: T[];
  onChange: (items: T[]) => void;
  fields: FieldSpec<T>[];
  newItem: () => T;
  itemTitle: (item: T, index: number) => string;
  errors: Record<string, string>;
  max: number;
  addLabel?: string;
  hint?: string;
}) {
  const update = (i: number, key: keyof T, value: unknown) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: value } : it)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const remove = (i: number) => {
    const title = itemTitle(items[i], i);
    if (!window.confirm(`'${title}'을(를) 목록에서 뺄까요? 저장해야 홈페이지에 반영됩니다.`)) return;
    onChange(items.filter((_, j) => j !== i));
  };

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 p-0">
      <legend className="mb-1 text-[15px] font-bold">{legend}</legend>
      {hint && <p className="m-0 -mt-1 text-sm text-ink-muted">{hint}</p>}
      {errors[name] && <p role="alert" className="m-0 text-sm text-[var(--danger)]">{errors[name]}</p>}
      {items.length === 0 && <p className="m-0 rounded-card border border-dashed border-line px-4 py-5 text-center text-[15px] text-ink-muted">아직 항목이 없습니다.</p>}
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item, i) => {
          const title = itemTitle(item, i);
          return (
            <li key={i} className="rounded-card border border-line bg-[#fcfcfa]">
              <div className="flex items-center gap-2 border-b border-line py-1.5 pr-1.5 pl-4">
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {i + 1}. {title}
                </span>
                <IconButton label={`${title} 위로`} disabled={i === 0} onClick={() => move(i, -1)} path="M6 15l6-6 6 6" />
                <IconButton label={`${title} 아래로`} disabled={i === items.length - 1} onClick={() => move(i, 1)} path="M6 9l6 6 6-6" />
                <IconButton label={`${title} 빼기`} onClick={() => remove(i)} path="M6 6l12 12M18 6L6 18" danger />
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                {fields.map((f) => {
                  const fieldName = `${name}.${i}.${f.key}`;
                  const error = errors[fieldName];
                  const value = item[f.key];
                  const cls = f.wide || f.type === "textarea" ? "sm:col-span-2" : "";
                  if (f.type === "checkbox") {
                    return (
                      <div key={f.key} className={`${cls} flex items-center`}>
                        <Checkbox label={f.label} hint={f.hint} checked={Boolean(value)} onChange={(v) => update(i, f.key, v)} />
                      </div>
                    );
                  }
                  if (f.type === "select") {
                    return (
                      <div key={f.key} className={cls}>
                        <Select label={f.label} name={fieldName} value={String(value)} onChange={(v) => update(i, f.key, v)} options={f.options ?? []} error={error} />
                      </div>
                    );
                  }
                  if (f.type === "textarea") {
                    return (
                      <div key={f.key} className={cls}>
                        <TextArea label={f.label} name={fieldName} rows={3} value={String(value ?? "")} onChange={(v) => update(i, f.key, v)} error={error} hint={f.hint ?? ""} required={f.required} />
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className={cls}>
                      <Input
                        label={f.label}
                        name={fieldName}
                        type={f.type ?? "text"}
                        value={String(value ?? "")}
                        onChange={(v) => update(i, f.key, v)}
                        error={error}
                        hint={f.hint}
                        required={f.required}
                      />
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      {items.length < max && (
        <button
          type="button"
          onClick={() => onChange([...items, newItem()])}
          className="h-11 w-fit rounded-card border-[1.5px] border-dashed border-primary px-4 text-[15px] font-bold text-primary hover:bg-primary-soft"
        >
          {addLabel}
        </button>
      )}
    </fieldset>
  );
}

function IconButton({ label, disabled, onClick, path, danger }: { label: string; disabled?: boolean; onClick: () => void; path: string; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-9 flex-none items-center justify-center rounded-card disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? "text-ink-muted hover:bg-[#fbeceb] hover:text-[var(--danger)]" : "text-ink hover:bg-accent-soft"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
      </svg>
    </button>
  );
}
