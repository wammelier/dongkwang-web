"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/components/admin/fields";
import { requireStaff } from "@/lib/auth";
import { isStoragePath } from "@/lib/files";
import { removeFiles } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type PostFile = { id: string; kind: "image" | "attachment"; path: string; name: string; size: number; has_consent: boolean };

const uuid = z.string().uuid();
const fileInput = z.object({
  path: z.string(),
  name: z.string().trim().min(1).max(200),
  size: z.number().int().nonnegative(),
});

/** 올린 파일을 글에 연결. 저장 위치는 posts/<글 id>/… 만 받는다 */
export async function addPostFiles(postId: string, kind: "image" | "attachment", files: unknown): Promise<ActionResult & { files?: PostFile[] }> {
  await requireStaff();
  const parsed = z.array(fileInput).min(1).max(20).safeParse(files);
  if (!uuid.safeParse(postId).success || !["image", "attachment"].includes(kind) || !parsed.success) {
    return { ok: false, message: "요청이 올바르지 않습니다." };
  }
  if (parsed.data.some((f) => !isStoragePath(f.path) || !f.path.startsWith(`posts/${postId}/`))) {
    return { ok: false, message: "파일 위치가 올바르지 않습니다. 다시 올려 주세요." };
  }

  const supabase = await createClient();
  const { count } = await supabase.from("post_files").select("id", { count: "exact", head: true }).eq("post_id", postId);
  const rows = parsed.data.map((f, i) => ({ post_id: postId, kind, path: f.path, name: f.name, size: f.size, sort: (count ?? 0) + i + 1 }));
  const { data, error } = await supabase.from("post_files").insert(rows).select("id, kind, path, name, size, has_consent");
  if (error || !data) {
    console.error("[post_files] 연결 실패:", error?.message);
    await removeFiles(parsed.data.map((f) => ({ bucket: kind === "image" ? "images" : "attachments", path: f.path })));
    return { ok: false, message: "파일을 글에 붙이지 못했습니다. 다시 올려 주세요." };
  }
  updateTag("posts");
  return { ok: true, message: kind === "image" ? "사진을 올렸습니다." : "파일을 붙였습니다.", files: data as PostFile[] };
}

/** 사진 공개 동의 확인 (확인한 사진만 홈페이지에 보인다) */
export async function setPhotoConsent(fileId: string, consent: boolean): Promise<ActionResult> {
  await requireStaff();
  if (!uuid.safeParse(fileId).success) return { ok: false, message: "요청이 올바르지 않습니다." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("post_files").update({ has_consent: Boolean(consent) }).eq("id", fileId).eq("kind", "image").select("id");
  if (error || !data?.length) return { ok: false, message: "바꾸지 못했습니다. 새로고침한 뒤 다시 시도해 주세요." };
  updateTag("posts");
  return { ok: true, message: consent ? "공개 동의를 확인했습니다. 홈페이지에 보입니다." : "홈페이지에서 숨겼습니다." };
}

/** 파일 빼기: 연결을 지우고 저장소 파일도 지운다 */
export async function removePostFile(fileId: string): Promise<ActionResult> {
  await requireStaff();
  if (!uuid.safeParse(fileId).success) return { ok: false, message: "요청이 올바르지 않습니다." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("post_files").delete().eq("id", fileId).select("kind, path");
  if (error || !data?.length) return { ok: false, message: "빼지 못했습니다. 새로고침한 뒤 다시 시도해 주세요." };
  await removeFiles(data.map((f) => ({ bucket: f.kind === "image" ? "images" : "attachments", path: f.path })));
  updateTag("posts");
  return { ok: true, message: "뺐습니다." };
}
