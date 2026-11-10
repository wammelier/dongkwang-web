import type { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { CHURCH_TAB_LABEL, CHURCH_TABS, type ChurchTab, type CommunityItem, type FaqItem } from "@/lib/church-info";
import { createClient } from "@/lib/supabase/server";
import { ChurchInfoForm, ChurchListForm, type WorshipFormItem } from "./ChurchForms";

export const metadata: Metadata = { title: "교회 정보" };

type Props = { searchParams: Promise<{ tab?: string }> };

// 탭마다 폼이 다르므로 해당 탭에 필요한 칼럼만 읽는다
const INFO_COLUMNS = {
  basic: "name, name_en, denomination, address, phone, office_hours, map_url, channels",
  visit: "parking_headline, parking_detail, transit, accessibility, welcome_steps, visit_steps",
  about: 'intro, "values", pastor_name, pastor_greeting, staff, history',
} as const;

export default async function ChurchInfoPage({ searchParams }: Props) {
  await requireSuperAdmin();
  const requested = (await searchParams).tab as ChurchTab;
  const tab: ChurchTab = CHURCH_TABS.includes(requested) ? requested : "basic";
  const supabase = await createClient();

  let body: React.ReactNode;
  let failed = false;

  if (tab === "basic" || tab === "visit" || tab === "about") {
    const columns: string = INFO_COLUMNS[tab];
    const { data, error } = await supabase.from("church_info").select(columns).eq("id", 1).maybeSingle();
    failed = Boolean(error || !data);
    // 빈 주소는 null로 저장되므로 입력칸에는 ""로
    const initial: Record<string, unknown> = { ...(data as Record<string, unknown> | null) };
    if (tab === "basic") initial.map_url = initial.map_url ?? "";
    if (tab === "basic" && Array.isArray(initial.channels)) {
      initial.channels = (initial.channels as { label: string; href: string | null }[]).map((c) => ({ label: c.label, href: c.href ?? "" }));
    }
    body = !failed && <ChurchInfoForm key={tab} tab={tab} initial={initial as never} />;
  } else if (tab === "worship") {
    const { data, error } = await supabase.from("worship_times").select("id, name, target, weekday, start_time, place, is_online, is_main, is_active").order("sort");
    failed = Boolean(error);
    const items: WorshipFormItem[] = (data ?? []).map((w) => ({ ...w, weekday: String(w.weekday), start_time: String(w.start_time).slice(0, 5) }));
    body = !failed && <ChurchListForm key={tab} tab="worship" initial={items} />;
  } else if (tab === "groups") {
    const { data, error } = await supabase
      .from("communities")
      .select("id, slug, name, target, age_range, meet_time, place, activities, how_to_join, contact, is_active")
      .order("sort");
    failed = Boolean(error);
    body = !failed && <ChurchListForm key={tab} tab="groups" initial={(data ?? []) as CommunityItem[]} />;
  } else {
    const { data, error } = await supabase.from("faqs").select("id, question, answer, is_active").order("sort");
    failed = Boolean(error);
    body = !failed && <ChurchListForm key={tab} tab="faq" initial={(data ?? []) as FaqItem[]} />;
  }

  return (
    <div className="flex max-w-[860px] flex-col gap-6">
      <div>
        <h1 className="m-0 text-[26px] font-bold">교회 정보</h1>
        <p className="m-0 mt-1 text-ink-muted">홈페이지 곳곳에 보이는 기본 정보입니다. 탭마다 따로 저장합니다.</p>
      </div>
      <nav aria-label="교회 정보 항목" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <ul className="m-0 flex list-none gap-1 border-b border-line p-0">
          {CHURCH_TABS.map((t) => (
            <li key={t} className="flex-none">
              <Link
                href={t === "basic" ? "/admin/church-info" : `/admin/church-info?tab=${t}`}
                aria-current={t === tab ? "page" : undefined}
                className={`-mb-px flex h-11 items-center border-b-2 px-3 text-[15px] whitespace-nowrap ${
                  t === tab ? "border-primary font-bold text-primary" : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {CHURCH_TAB_LABEL[t]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {failed ? (
        <p role="alert" className="m-0 rounded-card bg-[#fbeceb] px-4 py-3 text-[var(--danger)]">정보를 불러오지 못했습니다. 새로고침해 주세요.</p>
      ) : (
        body
      )}
    </div>
  );
}
