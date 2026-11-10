import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { rowToSermonDraft, type SermonRow } from "@/lib/sermons";
import { createClient } from "@/lib/supabase/server";
import { SermonEditor } from "../SermonEditor";

export const metadata: Metadata = { title: "설교 수정" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export default async function EditSermonPage({ params, searchParams }: Props) {
  await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { created } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("sermons").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const row = data as SermonRow;

  return (
    <div className="flex max-w-[1080px] flex-col gap-4">
      <h1 className="m-0 text-[26px] font-bold">설교 수정</h1>
      <SermonEditor
        key={row.id}
        id={row.id}
        initial={rowToSermonDraft(row)}
        meta={{ status: row.status, publishedAt: row.published_at, updatedAt: row.updated_at }}
        created={created === "1"}
      />
    </div>
  );
}
