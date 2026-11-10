"use client";

// 관리자 편집 화면 공통 입력칸 (화면 상태로 값을 관리하는 controlled 입력)
import { useId } from "react";

export type ActionResult = { ok: boolean; message: string; fieldErrors?: Record<string, string> };

export function ResultMessage({ result }: { result: Pick<ActionResult, "ok" | "message"> | null }) {
  if (!result) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={`m-0 rounded-card px-4 py-3 text-[15px] ${result.ok ? "bg-primary-soft text-primary" : "bg-[#fbeceb] text-[var(--danger)]"}`}
    >
      {result.message}
    </p>
  );
}

export function Checkbox({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px]">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 flex-none accent-[var(--primary)]" />
      <span>
        <span className="font-bold">{label}</span>
        {hint && <span className="block text-sm text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Select({
  label,
  name,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-bold">{label}</label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-12 rounded-card border bg-white px-3 text-base outline-none focus:border-primary ${error ? "border-[var(--danger)]" : "border-line"}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p id={`${id}-error`} className="m-0 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}

export function Input({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  type = "text",
  required,
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const id = `f-${name}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-bold">
        {label}
        {required && <span className="ml-1 text-[var(--danger)]" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`h-12 w-full min-w-0 rounded-card border bg-white px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:bg-[#fafaf8] disabled:text-ink-muted ${
          error ? "border-[var(--danger)]" : "border-line"
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="m-0 text-sm text-[var(--danger)]">{error}</p>
      ) : (
        hint && <p id={`${id}-hint`} className="m-0 text-sm text-ink-muted">{hint}</p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  name,
  value,
  onChange,
  error,
  rows = 14,
  hint = "줄바꿈은 그대로 보입니다.",
  required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  rows?: number;
  hint?: string;
  required?: boolean;
}) {
  const id = `f-${name}`;
  const countId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-bold">
        {label}
        {required && <span className="ml-1 text-[var(--danger)]" aria-hidden="true">*</span>}
      </label>
      <textarea
        id={id}
        name={name}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${error ? `${id}-error ` : ""}${countId}`}
        className={`rounded-card border bg-white px-4 py-3 text-base leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:bg-[#fafaf8] ${
          error ? "border-[var(--danger)]" : "border-line"
        }`}
      />
      <div className="flex justify-between gap-3 text-sm">
        {error ? <p id={`${id}-error`} className="m-0 text-[var(--danger)]">{error}</p> : <p className="m-0 text-ink-muted">{hint}</p>}
        <span id={countId} className="flex-none text-ink-muted">{value.length.toLocaleString()}자</span>
      </div>
    </div>
  );
}
