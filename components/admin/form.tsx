"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export type FormState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> };

export function Field({
  label,
  name,
  type = "text",
  state,
  hint,
  required,
  autoComplete,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  state?: FormState;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
}) {
  const error = state?.fieldErrors?.[name];
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-bold">
        {label}
        {required && <span className="ml-1 text-[var(--danger)]" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        // 실패해도 입력값 유지 (계획서 6.2) — 비밀번호는 다시 받는다
        defaultValue={type === "password" ? undefined : (state?.values?.[name] ?? defaultValue)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`h-12 rounded-card border bg-white px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft ${
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

export function SubmitButton({ children, pendingText, variant = "primary" }: { children: ReactNode; pendingText?: string; variant?: "primary" | "outline" | "danger" }) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-primary text-on-primary hover:bg-primary-hover",
    outline: "border-[1.5px] border-line text-ink hover:border-ink",
    danger: "border-[1.5px] border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white",
  };
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-11 items-center justify-center rounded-card px-5 text-[15px] font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${styles[variant]}`}
    >
      {pending ? (pendingText ?? "처리 중…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state?: FormState }) {
  if (!state?.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`m-0 rounded-card px-4 py-3 text-[15px] ${
        state.ok ? "bg-primary-soft text-primary" : "bg-[#fbeceb] text-[var(--danger)]"
      }`}
    >
      {state.message}
    </p>
  );
}
