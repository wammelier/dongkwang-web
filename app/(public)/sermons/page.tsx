import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui";
import { formatDot } from "@/lib/date";
import { getSermons } from "@/lib/queries";

export const metadata: Metadata = { title: "설교", description: "동광교회 주일 설교 목록" };

export default async function SermonsPage() {
  const sermons = await getSermons();

  return (
    <>
      <PageHeader eyebrow="예배·말씀" title="설교" />
      <Container className="py-9 sm:py-14">
        {sermons.length === 0 ? (
          <p className="text-ink-muted">아직 등록된 설교가 없습니다.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-line border-y border-line p-0">
            {sermons.map((s) => (
              <li key={s.id}>
                <Link href={`/sermons/${s.id}`} className="flex flex-col gap-1 py-5 text-ink hover:text-primary sm:flex-row sm:items-center sm:gap-6">
                  <span className="text-sm text-ink-muted sm:w-28">{formatDot(s.preachedOn)}</span>
                  <span className="flex-1 text-lg font-bold">{s.title}</span>
                  <span className="text-[15px] text-ink-muted">{s.scripture} · {s.preacher}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
