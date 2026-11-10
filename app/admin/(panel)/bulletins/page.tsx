import type { Metadata } from "next";
import { ContentList, NewButton, TrashTabs } from "@/components/admin/ContentList";
import { requireStaff } from "@/lib/auth";
import type { BulletinRow } from "@/lib/bulletins";
import { formatLong } from "@/lib/date";
import { displayState } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "주보" };

type Props = { searchParams: Promise<{ status?: string }> };

export default async function BulletinsAdminPage({ searchParams }: Props) {
  const admin = await requireStaff();
  const trashView = (await searchParams).status === "trashed";
  const supabase = await createClient();

  const count = async (trashed: boolean) => {
    const q = supabase.from("bulletins").select("id", { count: "exact", head: true });
    return ((await (trashed ? q.eq("status", "trashed") : q.neq("status", "trashed"))).count ?? 0);
  };
  const list = supabase.from("bulletins").select("id, date, title, file_path, status");
  const [all, trashed, { data, error }] = await Promise.all([
    count(false),
    count(true),
    (trashView ? list.eq("status", "trashed") : list.neq("status", "trashed")).order("date", { ascending: false }).limit(200),
  ]);
  const rows = (data ?? []) as Pick<BulletinRow, "id" | "date" | "title" | "file_path" | "status">[];

  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[26px] font-bold">주보</h1>
          <p className="m-0 mt-1 text-ink-muted">게시한 가장 최근 주보가 메인의 ‘이번 주 주보’에 나옵니다. 날짜마다 하나씩 올립니다.</p>
        </div>
        <NewButton href="/admin/bulletins/new">+ 주보 올리기</NewButton>
      </div>
      <TrashTabs base="/admin/bulletins" trashView={trashView} counts={{ all, trashed }} />
      {error ? (
        <p role="alert" className="m-0 rounded-card bg-[#fbeceb] px-4 py-3 text-[var(--danger)]">주보 목록을 불러오지 못했습니다. 새로고침해 주세요.</p>
      ) : (
        <ContentList
          table="bulletins"
          trashView={trashView}
          canPurge={admin.role === "super_admin"}
          items={rows.map((r) => ({
            id: r.id,
            title: r.title,
            sub: formatLong(r.date),
            state: displayState({ status: r.status, publish_start: null, publish_end: null }),
            href: `/admin/bulletins/${r.id}`,
            flag: r.file_path ? undefined : "파일 없음",
          }))}
          empty={<p className="m-0 font-bold">{trashView ? "휴지통이 비어 있습니다." : "아직 올린 주보가 없습니다."}</p>}
        />
      )}
    </div>
  );
}
