import { Badge, ExternalButton } from "@/components/ui";
import { eventRange, formatDot } from "@/lib/date";
import { formatSize } from "@/lib/files";
import { POST_TYPE_LABEL } from "@/lib/posts";
import type { Post } from "@/lib/types";

/** 소식 상세 본문. 공개 상세 페이지와 관리자 미리보기가 같은 모양을 쓴다 */
export function PostArticle({ post }: { post: Post }) {
  const images = post.files?.filter((f) => f.kind === "image") ?? [];
  const attachments = post.files?.filter((f) => f.kind === "attachment") ?? [];
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {post.isPinned && <Badge tone="important">중요</Badge>}
          <Badge tone={post.type}>{POST_TYPE_LABEL[post.type]}</Badge>
          <span className="text-sm text-ink-muted">{formatDot(post.publishedAt)}</span>
        </div>
        <h1 className="m-0 text-[30px] leading-[1.3] font-bold break-keep">{post.title}</h1>
      </div>

      {post.type === "event" && post.eventStart && (
        <dl className="m-0 grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 rounded-card bg-accent-soft p-5 text-[15px]">
          <dt className="text-ink-muted">일시</dt>
          <dd className="m-0">{eventRange(post.eventStart, post.eventEnd)}</dd>
          {post.eventPlace && (
            <>
              <dt className="text-ink-muted">장소</dt>
              <dd className="m-0">{post.eventPlace}</dd>
            </>
          )}
          {post.eventTarget && (
            <>
              <dt className="text-ink-muted">대상</dt>
              <dd className="m-0">{post.eventTarget}</dd>
            </>
          )}
        </dl>
      )}

      {images.length > 0 && (
        <div className={`grid gap-3 ${images.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {images.map((f) => (
            // eslint-disable-next-line @next/next/no-img-element -- 저장소 원본 (크기가 제각각이라 next/image 대신)
            <img key={f.url} src={f.url} alt="" loading="lazy" className="w-full rounded-card bg-accent-soft object-cover" />
          ))}
        </div>
      )}

      <div className="whitespace-pre-line break-words">{post.body}</div>

      {attachments.length > 0 && (
        <section aria-label="첨부파일" className="flex flex-col gap-2">
          <h2 className="m-0 text-[15px] font-bold">첨부파일</h2>
          <ul className="m-0 list-none divide-y divide-line rounded-card border border-line p-0">
            {attachments.map((f) => (
              <li key={f.url}>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 text-[15px]">
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="flex-none text-sm text-ink-muted">{formatSize(f.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {post.type === "event" && (
        <div>
          <ExternalButton href={post.applyUrl ?? null} fallback="신청 방법은 본문을 확인해 주세요.">
            신청하기
          </ExternalButton>
        </div>
      )}
    </>
  );
}

