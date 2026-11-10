import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PostFile } from "@/lib/actions/post-files";
import { requireStaff } from "@/lib/auth";
import { DISPLAY_LABEL, displayState, rowToDraft, savedMessage, type DisplayState, type PostRow } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import { PostEditor } from "../PostEditor";

export const metadata: Metadata = { title: "글 수정" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> };

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export default async function EditPostPage({ params, searchParams }: Props) {
  await requireStaff();
  const { id } = await params;
  const { saved } = await searchParams;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [{ data }, { data: files }] = await Promise.all([
    supabase.from("posts").select("*").eq("id", id).maybeSingle(),
    supabase.from("post_files").select("id, kind, path, name, size, has_consent").eq("post_id", id).order("sort"),
  ]);
  if (!data) notFound();
  const row = data as PostRow;

  return (
    <div className="flex max-w-[1080px] flex-col gap-4">
      <h1 className="m-0 text-[26px] font-bold">글 수정</h1>
      <PostEditor
        // 저장 후 서버 값이 바뀌어도 편집 중인 입력은 유지하고, 다른 글로 이동하면 새로 시작
        key={row.id}
        postId={row.id}
        initial={rowToDraft(row)}
        meta={{ status: row.status, state: displayState(row), publishedAt: row.published_at, updatedAt: row.updated_at }}
        initialFiles={(files ?? []) as PostFile[]}
        notice={saved && Object.hasOwn(DISPLAY_LABEL, saved) ? savedMessage(saved as DisplayState) : undefined}
      />
    </div>
  );
}
