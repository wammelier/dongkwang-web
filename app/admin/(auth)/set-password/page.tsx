"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, type FormState } from "@/components/admin/form";
import { setPassword } from "@/lib/actions/auth";

// 초대 링크·재설정 링크로 들어온 뒤 비밀번호를 정하는 화면 (proxy가 로그인 세션을 확인)
export default function SetPasswordPage() {
  const [state, action] = useActionState<FormState, FormData>(setPassword, {});
  return (
    <>
      <h1 className="m-0 mb-1 text-[22px] font-bold">비밀번호 정하기</h1>
      <p className="m-0 mb-6 text-[15px] text-ink-muted">다른 곳에서 쓰지 않는 10자 이상의 비밀번호를 정해 주세요.</p>
      <form action={action} className="flex flex-col gap-4" noValidate>
        <FormMessage state={state} />
        <Field label="새 비밀번호" name="password" type="password" autoComplete="new-password" hint="10자 이상" required state={state} />
        <Field label="새 비밀번호 확인" name="confirm" type="password" autoComplete="new-password" required state={state} />
        <SubmitButton pendingText="저장 중…">저장하고 시작하기</SubmitButton>
      </form>
    </>
  );
}
