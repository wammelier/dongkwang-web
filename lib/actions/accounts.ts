"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/form";
import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const role = z.enum(["super_admin", "editor"], { message: "역할을 선택해 주세요." });

/** 관리자 초대: 공개 가입은 없고, 최고 관리자가 보낸 초대 링크로만 계정이 생긴다 (계획서 2장) */
export async function inviteAdmin(_: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const values = {
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    role: String(formData.get("role") ?? "editor"),
  };
  const parsed = z
    .object({
      email: z.string().trim().email("이메일 형식이 아닙니다."),
      name: z.string().trim().min(1, "이름을 입력해 주세요.").max(40, "이름은 40자 이내로 입력해 주세요."),
      role,
    })
    .safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])), values };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { message: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않아 초대 메일을 보낼 수 없습니다.", values };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { name: parsed.data.name },
    redirectTo: `${SITE_URL}/admin/auth/callback?next=/admin/set-password`,
  });
  if (error || !data.user) {
    const exists = error?.code === "email_exists" || /already/i.test(error?.message ?? "");
    return { message: exists ? "이미 등록된 이메일입니다." : `초대 메일을 보내지 못했습니다. (${error?.message})`, values };
  }

  // 트리거가 editor로 만든 프로필에 이름·역할 반영 (세션 클라이언트 → RLS로 최고 관리자 확인)
  const supabase = await createClient();
  await supabase.from("profiles").update({ name: parsed.data.name, role: parsed.data.role }).eq("id", data.user.id);

  revalidatePath("/admin/accounts");
  return { ok: true, message: `${parsed.data.email}로 초대 메일을 보냈습니다. 링크에서 비밀번호를 정하면 로그인할 수 있습니다.` };
}

export async function updateAdmin(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireSuperAdmin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      role: role.optional(),
      is_active: z.enum(["true", "false"]).optional(),
    })
    .safeParse({
      id: formData.get("id"),
      role: formData.get("role") ?? undefined,
      is_active: formData.get("is_active") ?? undefined,
    });
  if (!parsed.success) return { message: "요청이 올바르지 않습니다." };

  const { id, role: nextRole, is_active } = parsed.data;
  if (id === me.id && is_active === "false") return { message: "자기 계정은 비활성화할 수 없습니다." };

  const patch: Record<string, unknown> = {};
  if (nextRole) patch.role = nextRole;
  if (is_active) patch.is_active = is_active === "true";

  const supabase = await createClient();
  const { error, count } = await supabase.from("profiles").update(patch, { count: "exact" }).eq("id", id);
  if (error) {
    return { message: error.code === "P0001" ? error.message : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!count) return { message: "권한이 없거나 계정을 찾을 수 없습니다." };

  revalidatePath("/admin/accounts");
  return { ok: true, message: is_active === "false" ? "계정을 비활성화했습니다. 즉시 로그인이 차단됩니다." : "저장했습니다." };
}
