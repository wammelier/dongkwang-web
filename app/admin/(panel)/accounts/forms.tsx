"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, type FormState } from "@/components/admin/form";
import { inviteAdmin, updateAdmin } from "@/lib/actions/accounts";

export type AccountRowData = {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "editor";
  is_active: boolean;
  created_at: string;
};

const ROLE_OPTIONS = [
  { value: "editor", label: "콘텐츠 담당자 — 공지·행사·주보·설교·이야기·절기 배너" },
  { value: "super_admin", label: "최고 관리자 — 전부 + 교회 정보·계정 관리" },
];

const selectClass =
  "h-12 rounded-card border border-line bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";

export function InviteForm() {
  const [state, action] = useActionState<FormState, FormData>(inviteAdmin, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="이름" name="name" required state={state} autoComplete="off" />
        <Field label="이메일" name="email" type="email" required state={state} autoComplete="off" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-role" className="text-[15px] font-bold">역할</label>
        <select id="f-role" name="role" defaultValue={state.values?.role ?? "editor"} className={selectClass}>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <SubmitButton pendingText="보내는 중…">초대 메일 보내기</SubmitButton>
      </div>
    </form>
  );
}

export function AccountRow({ account, isMe }: { account: AccountRowData; isMe: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(updateAdmin, {});
  return (
    <li className="flex flex-col gap-3 px-6 py-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-bold">{account.name || "(이름 없음)"}</span>
        {isMe && <span className="rounded bg-primary-soft px-2 text-xs font-bold text-primary">나</span>}
        {!account.is_active && <span className="rounded bg-accent-soft px-2 text-xs font-bold text-ink-muted">비활성</span>}
        <span className="text-[15px] text-ink-muted">{account.email}</span>
      </div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={account.id} />
        <label htmlFor={`role-${account.id}`} className="sr-only">역할</label>
        <select id={`role-${account.id}`} name="role" defaultValue={account.role} className={`${selectClass} h-11`}>
          <option value="editor">콘텐츠 담당자</option>
          <option value="super_admin">최고 관리자</option>
        </select>
        <SubmitButton variant="outline" pendingText="저장 중…">역할 저장</SubmitButton>
        {!isMe && (
          <button
            type="submit"
            name="is_active"
            value={account.is_active ? "false" : "true"}
            className={`inline-flex h-11 items-center rounded-card border-[1.5px] px-4 text-[15px] font-bold ${
              account.is_active
                ? "border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white"
                : "border-line text-ink hover:border-ink"
            }`}
          >
            {account.is_active ? "비활성화" : "다시 활성화"}
          </button>
        )}
      </form>
      <FormMessage state={state} />
    </li>
  );
}
