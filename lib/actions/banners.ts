"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/components/admin/fields";
import { requireStaff } from "@/lib/auth";
import { BANNER_COLUMNS, parseSpecialDraft, seasonTextSchema } from "@/lib/banner-admin";
import { banners as defaults } from "@/lib/banners";
import { formatDot, formatTime } from "@/lib/date";
import { overlappingSpecials, type BannerRow } from "@/lib/main-banner";
import { SAVE_INTENTS, statusAfter, type SaveIntent } from "@/lib/posts";
import type { SeasonKey } from "@/lib/season";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf } from "@/lib/validation";

const SEASONS = Object.keys(defaults) as SeasonKey[];
const FAILED: ActionResult = { ok: false, message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };

/** 그 절기의 배너 행 (휴지통 제외, 게시본 우선) */
async function seasonRow(key: SeasonKey) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("main_banners")
    .select("id, status, updated_at")
    .eq("kind", "season")
    .eq("season", key)
    .neq("status", "trashed")
    .order("updated_at", { ascending: false });
  const rows = (data ?? []) as { id: string; status: string }[];
  return { supabase, row: rows.find((r) => r.status === "published") ?? rows[0] ?? null };
}

/**
 * 절기 문구 저장. **문구를 고쳐도 '적용' 여부는 바뀌지 않는다.**
 * 연중은 늘 적용되는 기본 배너라 저장하면 바로 쓰이고, 다른 절기는 '적용'을 켠 절기에서만 쓰인다.
 * 행이 없던 절기는 '적용 안 함'으로 문구만 저장해 둔다.
 */
export async function saveSeasonText(key: SeasonKey, input: unknown): Promise<ActionResult> {
  await requireStaff();
  if (!SEASONS.includes(key)) return { ok: false, message: "요청이 올바르지 않습니다." };
  const parsed = seasonTextSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "입력 내용을 확인해 주세요.", fieldErrors: fieldErrorsOf(parsed.error) };

  const { supabase, row } = await seasonRow(key);
  const text = { title: parsed.data.title, description: parsed.data.description };
  const { error } = row
    ? await supabase.from("main_banners").update(key === "ordinary" ? { ...text, status: "published" } : text).eq("id", row.id)
    : await supabase.from("main_banners").insert({ ...text, kind: "season", season: key, status: key === "ordinary" ? "published" : "draft" });
  if (error) {
    console.error("[main_banners] 절기 문구 저장 실패:", error.message);
    return FAILED;
  }
  updateTag("banners");
  const note = key === "ordinary" || (row?.status === "published") ? "" : " ('적용'을 켜면 그 절기에 이 문구가 나옵니다.)";
  return { ok: true, message: `${defaults[key].name} 문구를 저장했습니다.${note}` };
}

/** 기본 문구로 되돌리기. 적용 여부는 그대로 둔다 */
export async function resetSeasonText(key: SeasonKey): Promise<ActionResult> {
  await requireStaff();
  if (!SEASONS.includes(key)) return { ok: false, message: "요청이 올바르지 않습니다." };
  const { supabase, row } = await seasonRow(key);
  if (!row) return { ok: true, message: "이미 기본 문구입니다." };
  const { error } = await supabase.from("main_banners").update({ title: defaults[key].title, description: defaults[key].description }).eq("id", row.id);
  if (error) return FAILED;
  updateTag("banners");
  return { ok: true, message: `${defaults[key].name}을(를) 기본 문구로 되돌렸습니다.` };
}

/**
 * 절기 적용 켜기·끄기. 기본은 모두 꺼짐이고, 켠 절기만 해마다 그 날짜에 배너가 바뀐다.
 * 켜지 않은 절기 날짜에는 연중 배너를 그대로 유지한다. 연중은 항상 적용이라 바꿀 수 없다.
 */
export async function setSeasonApplied(key: SeasonKey, on: boolean): Promise<ActionResult> {
  await requireStaff();
  if (!SEASONS.includes(key) || key === "ordinary") return { ok: false, message: "요청이 올바르지 않습니다." };
  const { supabase, row } = await seasonRow(key);
  const status = on ? "published" : "unpublished";
  const { error } = row
    ? await supabase.from("main_banners").update({ status }).eq("id", row.id)
    : on
      ? await supabase.from("main_banners").insert({ kind: "season", season: key, title: defaults[key].title, description: defaults[key].description, status })
      : { error: null };
  if (error) return FAILED;
  updateTag("banners");
  const name = defaults[key].name;
  return { ok: true, message: on ? `${name}을(를) 적용합니다. 해마다 그 날짜에 배너가 바뀝니다.` : `${name} 적용을 껐습니다. 그 기간에도 연중 배너를 유지합니다.` };
}

export type SpecialSaveResult = ActionResult & { id?: string };

/** 특별 배너 저장. 게시할 때 다른 게시 중인 특별 배너와 기간이 겹치면 막고 겹치는 일정을 알려 준다 */
export async function saveSpecialBanner(id: string | null, draft: unknown, intent: SaveIntent): Promise<SpecialSaveResult> {
  await requireStaff();
  if (!SAVE_INTENTS.includes(intent) || (id !== null && !z.string().uuid().safeParse(id).success)) {
    return { ok: false, message: "요청이 올바르지 않습니다." };
  }
  const supabase = await createClient();

  let current: BannerRow["status"] | null = null;
  if (id) {
    const { data } = await supabase.from("main_banners").select("status, kind").eq("id", id).maybeSingle();
    if (!data || data.kind !== "special") return { ok: false, message: "배너를 찾을 수 없습니다. 목록에서 다시 열어 주세요." };
    if (data.status === "trashed") return { ok: false, message: "휴지통에 있는 배너는 복구한 뒤에 고칠 수 있습니다." };
    current = data.status;
  }

  const status = statusAfter(intent, current);
  const parsed = parseSpecialDraft(draft, status === "published");
  if (!parsed.ok) return { ok: false, message: "입력 내용을 확인해 주세요.", fieldErrors: parsed.fieldErrors };

  if (status === "published") {
    const { data: others } = await supabase.from("main_banners").select(BANNER_COLUMNS).eq("kind", "special").eq("status", "published");
    const clash = overlappingSpecials((others ?? []) as BannerRow[], { id, ...parsed.values });
    if (clash.length) {
      const list = clash.map((r) => `‘${r.title.replace(/\n/g, " ")}’(${r.publish_start ? `${formatDot(r.publish_start)} ${formatTime(r.publish_start)}` : "지금"} ~ ${formatDot(r.publish_end!)} ${formatTime(r.publish_end!)})`);
      return {
        ok: false,
        message: `게시 중인 다른 특별 배너와 기간이 겹칩니다: ${list.join(", ")}. 기간을 바꾸거나 그 배너를 먼저 게시 중단해 주세요.`,
        fieldErrors: { publishStart: "다른 특별 배너와 겹칩니다.", publishEnd: "다른 특별 배너와 겹칩니다." },
      };
    }
  }

  const row = { ...parsed.values, status };
  const result = id
    ? await supabase.from("main_banners").update(row).eq("id", id).select("id").maybeSingle()
    : await supabase.from("main_banners").insert(row).select("id").single();
  if (result.error || !result.data) {
    console.error("[main_banners] 특별 배너 저장 실패:", result.error?.message);
    return FAILED;
  }
  updateTag("banners");
  const message =
    status === "published"
      ? parsed.values.publish_start && new Date(parsed.values.publish_start) > new Date()
        ? "저장했습니다. 시작 시각부터 메인에 보입니다."
        : "게시했습니다. 메인 배너에 바로 보입니다."
      : status === "unpublished"
        ? "게시를 중단했습니다. 지금 절기 배너로 돌아갑니다."
        : "임시 저장했습니다.";
  return { ok: true, message, id: result.data.id };
}
