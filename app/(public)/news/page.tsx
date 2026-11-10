import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/sections";
import { Container, PageHeader, TextLink } from "@/components/ui";
import { getPosts, isPastEvent } from "@/lib/queries";
import type { PostType } from "@/lib/types";

export const metadata: Metadata = { title: "교회 소식", description: "동광교회 공지사항, 행사, 교회 이야기" };

const TABS: { key?: PostType; label: string }[] = [
  { label: "전체" },
  { key: "notice", label: "공지" },
  { key: "event", label: "행사" },
  { key: "story", label: "교회 이야기" },
];

type Props = { searchParams: Promise<{ type?: string }> };

export default async function NewsPage({ searchParams }: Props) {
  const { type } = await searchParams;
  const active = TABS.find((t) => t.key === type)?.key;
  const posts = await getPosts(active);
  const upcoming = posts.filter((p) => !isPastEvent(p));
  const past = posts.filter((p) => isPastEvent(p));

  return (
    <>
      <PageHeader eyebrow="교회 소식" title="이번 주 알려드립니다" />
      <Container className="flex flex-col gap-6 sm:gap-8 py-8 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="소식 종류" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {TABS.map((t) => (
              <Link
                key={t.label}
                href={t.key ? `/news?type=${t.key}` : "/news"}
                aria-current={active === t.key ? "page" : undefined}
                className={`inline-flex h-10 flex-none items-center rounded-full border px-4 text-[15px] font-medium sm:h-11 sm:px-5 ${
                  active === t.key ? "border-primary bg-primary text-on-primary hover:text-on-primary" : "border-line text-ink hover:border-primary"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <TextLink href="/bulletins">주보 보기</TextLink>
        </div>

        {upcoming.length === 0 && past.length === 0 && <p className="text-ink-muted">아직 올라온 소식이 없습니다.</p>}

        {upcoming.length > 0 && <h2 className="sr-only">{past.length > 0 ? "진행 중인 소식" : "소식 목록"}</h2>}
        {upcoming.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <section aria-labelledby="past">
            <h2 id="past" className="mb-4 text-lg font-bold text-ink-muted">지난 행사</h2>
            <div className="grid grid-cols-1 gap-3 opacity-80 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
              {past.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}
