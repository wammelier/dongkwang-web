"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, type FormState } from "@/components/admin/form";
import { signIn } from "@/lib/actions/auth";

export function LoginForm({ next, notice, ok }: { next?: string; notice?: string; ok?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, notice ? { message: notice, ok } : {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="이메일" name="email" type="email" autoComplete="username" required state={state} />
      <Field label="비밀번호" name="password" type="password" autoComplete="current-password" required state={state} />
      <SubmitButton pendingText="로그인 중…">로그인</SubmitButton>
      <Link href="/admin/forgot-password" className="self-center text-sm">
        비밀번호를 잊으셨나요?
      </Link>
    </form>
  );
}
