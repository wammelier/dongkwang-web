"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { displayState, parsePostDraft, SAVE_INTENTS, savedMessage, statusAfter, type DisplayState, type SaveIntent } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import type { Status } from "@/lib/types";

export type PostSaveResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  id?: string;
  state?: DisplayState;
};

const id = z.string().uuid();

/**
 * 공지·행사·이야기 저장. id가 없으면 새 글.
 * 권한은 RLS(활성 관리자만 쓰기)가 다시 확인하고, 공개 페이지는 'posts' 태그로 바로 갱신된다.
 */
export async function savePost(postId: string | null, draft: unknown, intent: SaveIntent): Promise<PostSaveResult> {
  await requireStaff();
  if (!SAVE_INTENTS.includes(intent) || (postId !== null && !id.safeParse(postId).success)) {
    return { ok: false, message: "요청이 올바르지 않습니다." };
  }
  const supabase = await createClient();

  let current: Status | null = null;
  if (postId) {
    const { data } = await supabase.from("posts").select("status").eq("id", postId).maybeSingle();
    if (!data) return { ok: false, message: "글을 찾을 수 없습니다. 목록에서 다시 열어 주세요." };
    if (data.status === "trashed") return { ok: false, message: "휴지통에 있는 글은 복구한 뒤에 고칠 수 있습니다." };
    current = data.status;
  }

  const status = statusAfter(intent, current);
  const parsed = parsePostDraft(draft, status === "published");
  if (!parsed.ok) {
    return { ok: false, message: "입력 내용을 확인해 주세요.", fieldErrors: parsed.fieldErrors };
  }

  const row = { ...parsed.values, status };
  const result = postId
    ? await supabase.from("posts").update(row).eq("id", postId).select("id, status, publish_start, publish_end").maybeSingle()
    : await supabase.from("posts").insert(row).select("id, status, publish_start, publish_end").single();

  if (result.error || !result.data) {
    console.error("[posts] 저장 실패:", result.error?.message);
    return { ok: false, message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요. 계속되면 관리자에게 알려 주세요." };
  }

  updateTag("posts");
  const state = displayState(result.data);
  return { ok: true, message: savedMessage(state), id: result.data.id, state };
}
