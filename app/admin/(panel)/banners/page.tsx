import type { Metadata } from "next";
import { BannerView } from "@/components/BannerView";
import { ContentList, NewButton, TrashTabs } from "@/components/admin/ContentList";
import { requireStaff } from "@/lib/auth";
import { BANNER_COLUMNS } from "@/lib/banner-admin";
import { formatDot, formatTime } from "@/lib/date";
import { isSeasonApplied, resolveBanner, yearSchedule, type BannerRow } from "@/lib/main-banner";
import { banners as seasonDefaults } from "@/lib/banners";
import type { SeasonKey } from "@/lib/season";
import { displayState } from "@/lib/posts";
import { seoulToday } from "@/lib/season";
import { createClient } from "@/lib/supabase/server";
import { DatePreview } from "./DatePreview";
import { SeasonTexts } from "./SeasonTexts";

export const metadata: Metadata = { title: "절기 배너" };

type Props = { searchParams: Promise<{ status?: string }> };

export default async function BannersPage({ searchParams }: Props) {
  const admin = await requireStaff();
  const trashView = (await searchParams).status === "trashed";
  const supabase = await createClient();
  const { data, error } = await supabase.from("main_banners").select(BANNER_COLUMNS).order("publish_start", { ascending: false, nullsFirst: false });
  const rows = (data ?? []) as BannerRow[];
  const active = rows.filter((r) => r.status !== "trashed");
  const now = new Date();
  const current = resolveBanner(active, now);
  // 절기는 기본 꺼짐: 켠 절기가 몇 개인지 (연중은 늘 적용이라 제외)
  const appliedCount = (Object.keys(seasonDefaults) as SeasonKey[]).filter((k) => k !== "ordinary" && isSeasonApplied(active, k)).length;
  const year = Number(seoulToday(now).slice(0, 4));
  const specials = rows.filter((r) => r.kind === "special");

  if (error) {
    return <p role="alert" className="m-0 rounded-card bg-[#fbeceb] px-4 py-3 text-[var(--danger)]">배너 정보를 불러오지 못했습니다. 새로고침해 주세요.</p>;
  }

  return (
    <div className="flex max-w-[1080px] flex-col gap-8">
      <div>
        <h1 className="m-0 text-[26px] font-bold">절기 배너</h1>
        <p className="m-0 mt-1 text-ink-muted">메인 맨 위 배너는 날짜에 맞춰 저절로 바뀝니다. 문구를 고치거나 행사 때 특별 배너를 걸 수 있습니다.</p>
      </div>

      <section aria-labelledby="now" className="flex flex-col gap-4">
        <div className="rounded-card border border-line bg-white p-5 sm:p-6">
          <p className="m-0 flex items-center gap-2 text-sm font-medium text-primary">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />{" "}
            {appliedCount === 0 ? "기본(연중) 배너 유지 중 · 절기 변경을 켜지 않았습니다" : `절기 자동 변경 중 · 적용한 절기 ${appliedCount}개`}
          </p>
          <h2 id="now" className="m-0 mt-2 text-xl font-bold">
            지금: {current.source === "special" ? `특별 배너 (${current.seasonName} 기간)` : current.seasonName}
          </h2>
          <p className="m-0 mt-1 text-[15px] text-ink-muted">{current.reason}</p>
          <p className="m-0 mt-1 text-[15px] text-ink-muted">
            {current.nextChangeAt
              ? `다음 전환: ${formatDot(current.nextChangeAt)} ${formatTime(current.nextChangeAt)} (한국 시간)`
              : "다음 전환: 예정 없음 (적용한 절기가 없어 연중 배너를 계속 보여 줍니다)"}
          </p>
        </div>
        <div className="overflow-hidden rounded-card border border-line">
          <BannerView banner={current} preview />
        </div>
      </section>

      <DatePreview rows={active} today={seoulToday(now)} />

      <SeasonTexts year={year} schedule={yearSchedule(year, true)} rows={active.filter((r) => r.kind === "season")} currentKey={current.seasonKey} />

      <section aria-labelledby="specials" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="specials" className="m-0 text-lg font-bold">특별 배너</h2>
            <p className="m-0 mt-1 text-[15px] text-ink-muted">행사·창립기념일처럼 기간을 정해 절기 배너 대신 보입니다. 끝나면 그때의 절기 배너로 돌아갑니다.</p>
          </div>
          <NewButton href="/admin/banners/special/new">+ 특별 배너 만들기</NewButton>
        </div>
        <TrashTabs
          base="/admin/banners"
          trashView={trashView}
          counts={{ all: specials.filter((r) => r.status !== "trashed").length, trashed: specials.filter((r) => r.status === "trashed").length }}
        />
        <ContentList
          table="main_banners"
          trashView={trashView}
          canPurge={admin.role === "super_admin"}
          items={specials
            .filter((r) => (trashView ? r.status === "trashed" : r.status !== "trashed"))
            .map((r) => ({
              id: r.id,
              title: r.title.replace(/\n/g, " "),
              sub: `${r.publish_start ? `${formatDot(r.publish_start)} ${formatTime(r.publish_start)}` : "게시하면 바로"} ~ ${formatDot(r.publish_end!)} ${formatTime(r.publish_end!)}`,
              state: displayState(r, now),
              href: `/admin/banners/special/${r.id}`,
            }))}
          empty={<p className="m-0 font-bold">{trashView ? "휴지통이 비어 있습니다." : "특별 배너가 없습니다. 지금은 절기 배너가 자동으로 보입니다."}</p>}
        />
      </section>
    </div>
  );
}
