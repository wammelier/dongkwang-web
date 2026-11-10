"use server";

import { updateTag } from "next/cache";
import type { ActionResult } from "@/components/admin/fields";
import { getCurrentAdmin } from "@/lib/auth";
import { CHURCH_INFO_SCHEMAS, LIST_SCHEMAS, parseChurchInfo, parseList, type ChurchInfoTab, type ListTab } from "@/lib/church-info";
import { createClient } from "@/lib/supabase/server";

const RPC: Record<ListTab, string> = { worship: "save_worship_times", groups: "save_communities", faq: "save_faqs" };

async function superAdminOnly(): Promise<ActionResult | null> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, message: "로그인이 풀렸습니다. 다시 로그인해 주세요." };
  if (admin.role !== "super_admin") return { ok: false, message: "교회 정보는 최고 관리자만 바꿀 수 있습니다." };
  return null;
}

/** 교회 정보(기본·방문·소개) 탭 저장 */
export async function saveChurchInfo(tab: ChurchInfoTab, input: unknown): Promise<ActionResult> {
  const denied = await superAdminOnly();
  if (denied) return denied;
  if (!(tab in CHURCH_INFO_SCHEMAS)) return { ok: false, message: "요청이 올바르지 않습니다." };

  const parsed = parseChurchInfo(tab, input);
  if (!parsed.ok) return { ok: false, message: "입력 내용을 확인해 주세요.", fieldErrors: parsed.fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.from("church_info").update(parsed.values).eq("id", 1).select("id");
  if (error || !data?.length) {
    console.error("[church_info] 저장 실패:", error?.message ?? "행 없음");
    return { ok: false, message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  updateTag("church");
  return { ok: true, message: "저장했습니다. 홈페이지에 바로 반영됩니다." };
}

/** 예배 시간·공동체·FAQ 목록 저장 (한 트랜잭션: 실패하면 전부 취소) */
export async function saveChurchList(tab: ListTab, items: unknown): Promise<ActionResult> {
  const denied = await superAdminOnly();
  if (denied) return denied;
  if (!(tab in LIST_SCHEMAS)) return { ok: false, message: "요청이 올바르지 않습니다." };

  const parsed = parseList(tab, items);
  if (!parsed.ok) {
    return { ok: false, message: parsed.fieldErrors.items ?? "입력 내용을 확인해 주세요.", fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(RPC[tab], { items: parsed.items });
  if (error) {
    console.error(`[${RPC[tab]}] 저장 실패:`, error.message);
    const known = error.code === "42501" || error.code === "22023";
    return { ok: false, message: known ? error.message : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  updateTag(tab === "groups" ? "communities" : "church");
  return { ok: true, message: "저장했습니다. 홈페이지에 바로 반영됩니다." };
}
