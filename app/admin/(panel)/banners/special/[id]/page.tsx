import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { BANNER_COLUMNS, rowToSpecialDraft } from "@/lib/banner-admin";
import type { BannerRow } from "@/lib/main-banner";
import { createClient } from "@/lib/supabase/server";
import { SpecialEditor } from "../../SpecialEditor";

export const metadata: Metadata = { title: "특별 배너 수정" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export default async function EditSpecialPage({ params, searchParams }: Props) {
  await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { created } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: pub }] = await Promise.all([
    supabase.from("main_banners").select(`${BANNER_COLUMNS}, published_at, updated_at`).eq("id", id).eq("kind", "special").maybeSingle(),
    supabase.from("main_banners").select(BANNER_COLUMNS).eq("status", "published"),
  ]);
  if (!data) notFound();
  const row = data as BannerRow & { published_at: string | null; updated_at: string };
  const published = (pub ?? []) as BannerRow[];

  return (
    <div className="flex max-w-[1080px] flex-col gap-4">
      <h1 className="m-0 text-[26px] font-bold">특별 배너 수정</h1>
      <SpecialEditor
        key={row.id}
        id={row.id}
        initial={rowToSpecialDraft(row)}
        meta={{ status: row.status, publishStart: row.publish_start, publishEnd: row.publish_end, publishedAt: row.published_at, updatedAt: row.updated_at }}
        others={published.filter((r) => r.kind === "special" && r.id !== row.id)}
        seasons={published.filter((r) => r.kind === "season")}
        created={created === "1"}
      />
    </div>
  );
}
