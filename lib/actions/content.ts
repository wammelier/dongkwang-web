"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/components/admin/fields";
import { requireStaff } from "@/lib/auth";
import { removeFiles } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type ContentTable = "posts" | "bulletins" | "sermons" | "main_banners";
const TABLES: ContentTable[] = ["posts", "bulletins", "sermons", "main_banners"];
const LABEL: Record<ContentTable, string> = { posts: "글", bulletins: "주보", sermons: "설교", main_banners: "배너" };
const TAG = { posts: "posts", bulletins: "bulletins", sermons: "sermons", main_banners: "banners" } as const;

/** 휴지통으로 옮기기 · 복구(임시 저장으로) · 완전 삭제(최고 관리자, 휴지통에서만, 올린 파일도 지움) */
export async function changeContentStatus(table: ContentTable, id: string, op: "trash" | "restore" | "purge"): Promise<ActionResult> {
  const admin = await requireStaff();
  if (!TABLES.includes(table) || !z.string().uuid().safeParse(id).success || !["trash", "restore", "purge"].includes(op)) {
    return { ok: false, message: "요청이 올바르지 않습니다." };
  }
  const supabase = await createClient();

  if (op === "purge") {
    if (admin.role !== "super_admin") return { ok: false, message: "완전 삭제는 최고 관리자만 할 수 있습니다." };

    // 지우기 전에 파일 위치를 모아 둔다 (post_files는 글과 함께 지워짐)
    const files: { bucket: string; path: string }[] = [];
    if (table === "bulletins") {
      const { data } = await supabase.from("bulletins").select("file_path").eq("id", id).maybeSingle();
      if (data?.file_path) files.push({ bucket: "bulletins", path: data.file_path });
    } else if (table === "posts") {
      const { data } = await supabase.from("post_files").select("kind, path").eq("post_id", id);
      for (const f of data ?? []) files.push({ bucket: f.kind === "image" ? "images" : "attachments", path: f.path });
    }

    const { error, count } = await supabase.from(table).delete({ count: "exact" }).eq("id", id).eq("status", "trashed");
    if (error || !count) return { ok: false, message: `삭제하지 못했습니다. 휴지통에 있는 ${LABEL[table]}만 완전 삭제할 수 있습니다.` };
    await removeFiles(files);
    updateTag(TAG[table]);
    return { ok: true, message: "완전히 삭제했습니다." };
  }

  const query = supabase.from(table).update({ status: op === "trash" ? "trashed" : "draft" }).eq("id", id);
  const { data, error } = await (op === "trash" ? query.neq("status", "trashed") : query.eq("status", "trashed")).select("id");
  if (error || !data?.length) return { ok: false, message: "처리하지 못했습니다. 새로고침한 뒤 다시 시도해 주세요." };
  updateTag(TAG[table]);
  return {
    ok: true,
    message: op === "trash" ? "휴지통으로 옮겼습니다. 휴지통에서 복구할 수 있습니다." : "복구했습니다. 임시 저장 상태입니다.",
  };
}
