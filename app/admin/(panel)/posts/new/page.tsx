import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { emptyDraft, POST_TYPES } from "@/lib/posts";
import type { PostType } from "@/lib/types";
import { PostEditor } from "../PostEditor";

export const metadata: Metadata = { title: "새 글 쓰기" };

type Props = { searchParams: Promise<{ type?: string }> };

export default async function NewPostPage({ searchParams }: Props) {
  await requireStaff();
  const { type } = await searchParams;
  const initialType = POST_TYPES.includes(type as PostType) ? (type as PostType) : "notice";

  return (
    <div className="flex max-w-[1080px] flex-col gap-4">
      <h1 className="m-0 text-[26px] font-bold">새 글 쓰기</h1>
      <PostEditor postId={null} initial={emptyDraft(initialType)} meta={null} />
    </div>
  );
}
