import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import {
  escapeLike,
  POST_TYPE_LABEL,
  POST_TYPES,
  STATUS_FILTER_LABEL,
  STATUS_FILTERS,
  type PostRow,
  type StatusFilter,
} from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import type { PostType } from "@/lib/types";
import { PostList } from "./PostList";

export const metadata: Metadata = { title: "공지·행사·이야기" };

const PAGE_SIZE = 20;
const LIST_COLUMNS = "id, type, title, status, is_pinned, publish_start, publish_end, published_at, updated_at";

type Props = { searchParams: Promise<{ status?: string; type?: string; q?: string; page?: string }> };

export default async function PostsPage({ searchParams }: Props) {
  const admin = await requireStaff();
  const sp = await searchParams;
  const status: StatusFilter = STATUS_FILTERS.includes(sp.status as StatusFilter) ? (sp.status as StatusFilter) : "all";
  const type = POST_TYPES.includes(sp.type as PostType) ? (sp.type as PostType) : undefined;
  const q = (sp.q ?? "").trim().slice(0, 50);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();

  // 상태 탭 숫자 (종류·검색 조건을 함께 적용)
  const countFor = async (s: StatusFilter) => {
    let query = supabase.from("posts").select("id", { count: "exact", head: true });
    query = s === "all" ? query.neq("status", "trashed") : query.eq("status", s);
    if (type) query = query.eq("type", type);
    if (q) query = query.ilike("title", `%${escapeLike(q)}%`);
    return (await query).count ?? 0;
  };
  const counts = Object.fromEntries(await Promise.all(STATUS_FILTERS.map(async (s) => [s, await countFor(s)] as const))) as Record<
    StatusFilter,
    number
  >;

  let query = supabase.from("posts").select(LIST_COLUMNS, { count: "exact" });
  query = status === "all" ? query.neq("status", "trashed") : query.eq("status", status);
  if (type) query = query.eq("type", type);
  if (q) query = query.ilike("title", `%${escapeLike(q)}%`);
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .order(status === "trashed" ? "deleted_at" : "updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  const rows = (data ?? []) as Pick<PostRow, "id" | "type" | "title" | "status" | "is_pinned" | "publish_start" | "publish_end" | "published_at" | "updated_at">[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const href = (next: Partial<{ status: StatusFilter; type: string; q: string; page: number }>) => {
    const params = new URLSearchParams();
    const merged = { status, type: type ?? "", q, page: 1, ...next };
    if (merged.status !== "all") params.set("status", merged.status);
    if (merged.type) params.set("type", merged.type);
    if (merged.q) params.set("q", merged.q);
    if (merged.page > 1) params.set("page", String(merged.page));
    const s = params.toString();
    return s ? `/admin/posts?${s}` : "/admin/posts";
  };

  return (
    <div className="flex max-w-[1080px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-[26px] font-bold">공지·행사·이야기</h1>
          <p className="m-0 mt-1 text-ink-muted">게시하면 홈페이지에 바로 보이고, 임시 저장 글은 관리자에게만 보입니다.</p>
        </div>
        <Link
          href={type ? `/admin/posts/new?type=${type}` : "/admin/posts/new"}
          className="inline-flex h-11 items-center rounded-card bg-primary px-5 text-[15px] font-bold text-on-primary hover:bg-primary-hover hover:text-on-primary"
        >
          + 새 글 쓰기
        </Link>
      </div>

      <nav aria-label="상태" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <ul className="m-0 flex list-none gap-1 border-b border-line p-0">
          {STATUS_FILTERS.map((s) => (
            <li key={s} className="flex-none">
              <Link
                href={href({ status: s })}
                aria-current={s === status ? "page" : undefined}
                className={`-mb-px flex h-11 items-center gap-1.5 border-b-2 px-3 text-[15px] ${
                  s === status ? "border-primary font-bold text-primary" : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {STATUS_FILTER_LABEL[s]}
                <span className="text-sm font-normal">{counts[s]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form role="search" action="/admin/posts" className="flex flex-wrap gap-2">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <label htmlFor="q" className="sr-only">제목 검색</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="제목 검색"
          className="h-11 min-w-0 flex-1 rounded-card border border-line bg-white px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft sm:max-w-[320px]"
        />
        <label htmlFor="type" className="sr-only">종류</label>
        <select
          id="type"
          name="type"
          defaultValue={type ?? ""}
          className="h-11 rounded-card border border-line bg-white px-3 text-base outline-none focus:border-primary"
        >
          <option value="">모든 종류</option>
          {POST_TYPES.map((t) => (
            <option key={t} value={t}>{POST_TYPE_LABEL[t]}</option>
          ))}
        </select>
        <button type="submit" className="h-11 rounded-card border-[1.5px] border-line bg-white px-5 text-[15px] font-bold hover:border-ink">
          검색
        </button>
        {(q || type) && (
          <Link href={href({ q: "", type: "" })} className="flex h-11 items-center px-2 text-sm text-ink-muted">
            조건 지우기
          </Link>
        )}
      </form>

      {error ? (
        <p role="alert" className="m-0 rounded-card bg-[#fbeceb] px-4 py-3 text-[var(--danger)]">
          글 목록을 불러오지 못했습니다. 새로고침해 주세요.
        </p>
      ) : (
        <PostList rows={rows} trashView={status === "trashed"} canPurge={admin.role === "super_admin"} filtered={Boolean(q || type)} />
      )}

      {totalPages > 1 && (
        <nav aria-label="쪽" className="flex items-center justify-center gap-4 text-[15px]">
          {page > 1 ? <Link href={href({ page: page - 1 })}>← 이전</Link> : <span className="text-ink-muted">← 이전</span>}
          <span aria-current="page">{page} / {totalPages}</span>
          {page < totalPages ? <Link href={href({ page: page + 1 })}>다음 →</Link> : <span className="text-ink-muted">다음 →</span>}
        </nav>
      )}
    </div>
  );
}
