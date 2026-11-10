"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { SECTION_KEYS, SECTION_TEXT, type SectionKey } from "@/lib/main-sections";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf } from "@/lib/validation";

export type SaveResult = { ok: boolean; message: string };

const schema = z
  .array(z.object({ key: z.enum(SECTION_KEYS), isVisible: z.boolean() }))
  .length(SECTION_KEYS.length)
  .refine((items) => new Set(items.map((i) => i.key)).size === SECTION_KEYS.length, "구역이 중복되었습니다.");

/** 메인 구역 순서·노출 저장 → 공개 메인 즉시 갱신 (계획서 7장) */
export async function saveMainSections(input: unknown): Promise<SaveResult> {
  await requireSuperAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "저장할 내용이 올바르지 않습니다. 새로고침 후 다시 시도해 주세요." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_main_sections", {
    items: parsed.data.map((s, i) => ({ key: s.key, is_visible: s.isVisible, sort: i + 1 })),
  });
  if (error) {
    return {
      ok: false,
      message: error.code === "42501" ? "최고 관리자만 바꿀 수 있습니다." : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  updateTag("church");
  const visible = parsed.data.filter((s) => s.isVisible).length;
  return { ok: true, message: `저장했습니다. 메인에 ${visible}개 구역이 바로 반영됩니다.` };
}

const textSchema = z.object({
  headline: z
    .string()
    .trim()
    .max(40, "제목은 40자 이내로 입력해 주세요.")
    .refine((v) => v.split("\n").length <= 2, "제목은 두 줄까지 쓸 수 있습니다."),
  body: z.string().trim().max(200, "소개 문구는 200자 이내로 입력해 주세요."),
});

/** 구역 제목·소개 문구 저장. 비우면 기본 문구로 돌아간다 */
export async function saveSectionText(key: SectionKey, input: unknown): Promise<SaveResult & { fieldErrors?: Record<string, string> }> {
  await requireSuperAdmin();
  if (!SECTION_TEXT[key]) return { ok: false, message: "이 구역은 고칠 문구가 없습니다." };
  const parsed = textSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "입력 내용을 확인해 주세요.", fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.from("main_sections").update(parsed.data).eq("key", key).select("key");
  if (error || !data?.length) {
    return { ok: false, message: error?.code === "42501" ? "최고 관리자만 바꿀 수 있습니다." : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  updateTag("church");
  return { ok: true, message: parsed.data.headline || parsed.data.body ? "문구를 저장했습니다. 메인에 바로 반영됩니다." : "기본 문구로 되돌렸습니다." };
}
