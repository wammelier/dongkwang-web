import "server-only";
import { updateTag } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/components/admin/fields";
import { requireStaff } from "./auth";
import { SAVE_INTENTS, statusAfter, type SaveIntent } from "./posts";
import { createClient } from "./supabase/server";
import type { Status } from "./types";

type Parsed<V> = { ok: true; values: V } | { ok: false; fieldErrors: Record<string, string> };

export type SaveResult = ActionResult & { id?: string };

const STATUS_MESSAGE: Record<Status, string> = {
  published: "게시했습니다. 홈페이지에 바로 보입니다.",
  draft: "임시 저장했습니다. 홈페이지에는 보이지 않습니다.",
  unpublished: "게시를 중단했습니다. 홈페이지에서 내려갔습니다.",
  trashed: "",
};

/**
 * 주보·설교 저장 공통 흐름: 권한 → 현재 상태 → 입력 검사 → 저장 → 공개 페이지 갱신.
 * onUniqueViolation: 고유 제약(같은 날짜 주보 등)에 걸렸을 때 칸 오류로 바꿔 준다.
 */
export async function saveContent<V extends Record<string, unknown>>(opts: {
  table: "bulletins" | "sermons";
  label: string;
  id: string | null;
  intent: SaveIntent;
  parse: (publishing: boolean) => Parsed<V>;
  onUniqueViolation?: Record<string, string>;
  /** 저장 성공 후 (예: 바뀐 파일의 옛 파일 지우기) */
  afterSave?: (before: Record<string, unknown> | null, values: V) => Promise<void>;
  beforeColumns?: string;
}): Promise<SaveResult> {
  await requireStaff();
  const { table, label, id, intent } = opts;
  if (!SAVE_INTENTS.includes(intent) || (id !== null && !z.string().uuid().safeParse(id).success)) {
    return { ok: false, message: "요청이 올바르지 않습니다." };
  }
  const supabase = await createClient();

  let before: Record<string, unknown> | null = null;
  if (id) {
    const { data } = await supabase.from(table).select(`status${opts.beforeColumns ? `, ${opts.beforeColumns}` : ""}`).eq("id", id).maybeSingle();
    if (!data) return { ok: false, message: `${label}을(를) 찾을 수 없습니다. 목록에서 다시 열어 주세요.` };
    before = data as unknown as Record<string, unknown>;
    if (before.status === "trashed") return { ok: false, message: `휴지통에 있는 ${label}은(는) 복구한 뒤에 고칠 수 있습니다.` };
  }

  const status = statusAfter(intent, (before?.status as Status) ?? null);
  const parsed = opts.parse(status === "published");
  if (!parsed.ok) return { ok: false, message: "입력 내용을 확인해 주세요.", fieldErrors: parsed.fieldErrors };

  const row = { ...parsed.values, status };
  const result = id
    ? await supabase.from(table).update(row).eq("id", id).select("id").maybeSingle()
    : await supabase.from(table).insert(row).select("id").single();

  if (result.error?.code === "23505" && opts.onUniqueViolation) {
    return { ok: false, message: "입력 내용을 확인해 주세요.", fieldErrors: opts.onUniqueViolation };
  }
  if (result.error || !result.data) {
    console.error(`[${table}] 저장 실패:`, result.error?.message);
    return { ok: false, message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요. 계속되면 관리자에게 알려 주세요." };
  }

  await opts.afterSave?.(before, parsed.values);
  updateTag(table);
  return { ok: true, message: STATUS_MESSAGE[status], id: result.data.id };
}
