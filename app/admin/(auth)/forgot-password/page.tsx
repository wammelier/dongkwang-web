"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, type FormState } from "@/components/admin/form";
import { requestPasswordReset } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, {});
  return (
    <>
      <h1 className="m-0 mb-1 text-[22px] font-bold">비밀번호 찾기</h1>
      <p className="m-0 mb-6 text-[15px] text-ink-muted">관리자 이메일로 비밀번호를 다시 정하는 링크를 보내 드립니다.</p>
      <form action={action} className="flex flex-col gap-4" noValidate>
        <FormMessage state={state} />
        <Field label="이메일" name="email" type="email" autoComplete="username" required state={state} />
        <SubmitButton pendingText="보내는 중…">재설정 링크 받기</SubmitButton>
        <Link href="/admin/login" className="self-center text-sm">
          로그인으로 돌아가기
        </Link>
      </form>
    </>
  );
}
