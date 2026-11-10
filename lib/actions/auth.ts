"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/admin/form";
import { SITE_URL } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD = 10; // 계획서 11장

const email = z.string().trim().min(1, "이메일을 입력해 주세요.").email("이메일 형식이 아닙니다.");

/** 로그인 후 돌아갈 곳은 관리자 경로만 허용 (외부 주소로 보내는 열린 리디렉션 방지) */
const safeNext = (value: FormDataEntryValue | null) =>
  typeof value === "string" && /^\/admin(\/[\w\-/]*)?$/.test(value) ? value : "/admin";

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((i) => [String(i.path[0]), i.message]));
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = z.object({ email, password: z.string().min(1, "비밀번호를 입력해 주세요.") }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    const tooMany = error?.status === 429;
    return {
      message: tooMany
        ? "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요."
        : "이메일 또는 비밀번호가 맞지 않습니다.",
      values,
    };
  }

  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { message: "사용이 중지된 계정입니다. 최고 관리자에게 문의해 주세요.", values };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login?reason=signed-out");
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message }, values };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${SITE_URL}/admin/auth/confirm?next=/admin/set-password`,
  });
  // 계정 존재 여부를 알려주지 않는다
  return { ok: true, message: "등록된 관리자 이메일이라면 비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요." };
}

export async function setPassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      password: z.string().min(MIN_PASSWORD, `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "두 비밀번호가 같지 않습니다." })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      message:
        error.code === "same_password"
          ? "이전과 다른 비밀번호를 입력해 주세요."
          : error.code === "weak_password"
            ? "더 길고 추측하기 어려운 비밀번호를 입력해 주세요."
            : "비밀번호를 저장하지 못했습니다. 링크가 만료되었다면 비밀번호 찾기로 새 링크를 받아 주세요.",
    };
  }
  redirect("/admin?welcome=1");
}
