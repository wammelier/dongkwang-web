import type { Metadata } from "next";
import { ContentList, NewButton, TrashTabs } from "@/components/admin/ContentList";
import { requireStaff } from "@/lib/auth";
import { formatLong } from "@/lib/date";
import { displayState } from "@/lib/posts";
import { preacherLabel, type SermonRow } from "@/lib/sermons";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "설교" };

type Props = { searchParams: Promise<{ status?: string }> };

export default async function SermonsAdminPage({ searchParams }: Props) {
  const admin = await requireStaff();
  const trashView = (await searchParams).status === "trashed";
  const supabase = await createClient();

  const count = async (trashed: boolean) => {
    const q = supabase.from("sermons").select("id", { count: "exact", head: true });
    return (await (trashed ? q.eq("status", "trashed") : q.neq("status", "trashed"))).count ?? 0;
  };
  const list = supabase.from("sermons").select("id, title, preacher, preached_on, video_url, status");
  const [all, trashed, { data, error }] = await Promise.all([
    count(false),
    count(true),
    (trashView ? list.eq("status", "trashed") : list.neq("status", "trashed")).order("preached_on", { ascending: false }).limit(200),
  ]);
  const rows = (data ?? []) as Pick<SermonRow, "id" | "title" | "preacher" | "preached_on" | "video_url" | "status">[];

  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[26px] font-bold">설교</h1>
          <p className="m-0 mt-1 text-ink-muted">게시한 가장 최근 설교가 메인의 ‘최근 말씀’에 나옵니다.</p>
        </div>
        <NewButton href="/admin/sermons/new">+ 설교 등록</NewButton>
      </div>
      <TrashTabs base="/admin/sermons" trashView={trashView} counts={{ all, trashed }} />
      {error ? (
        <p role="alert" className="m-0 rounded-card bg-[#fbeceb] px-4 py-3 text-[var(--danger)]">설교 목록을 불러오지 못했습니다. 새로고침해 주세요.</p>
      ) : (
        <ContentList
          table="sermons"
          trashView={trashView}
          canPurge={admin.role === "super_admin"}
          items={rows.map((r) => ({
            id: r.id,
            title: r.title,
            sub: [formatLong(r.preached_on), preacherLabel(r.preacher)].filter(Boolean).join(" · "),
            state: displayState({ status: r.status, publish_start: null, publish_end: null }),
            href: `/admin/sermons/${r.id}`,
            flag: r.video_url ? undefined : "영상 링크 없음",
          }))}
          empty={<p className="m-0 font-bold">{trashView ? "휴지통이 비어 있습니다." : "아직 등록한 설교가 없습니다."}</p>}
        />
      )}
    </div>
  );
}
