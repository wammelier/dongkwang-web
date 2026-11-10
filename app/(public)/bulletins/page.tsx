import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { formatLong } from "@/lib/date";
import { getBulletins } from "@/lib/queries";

export const metadata: Metadata = { title: "주보", description: "동광교회 주간 주보" };

export default async function BulletinsPage() {
  const bulletins = await getBulletins();

  return (
    <>
      <PageHeader eyebrow="교회 소식" title="주보" description="예배 변경과 행사 일정은 교회 소식에서도 바로 읽을 수 있습니다." />
      <Container className="py-9 sm:py-14">
        {bulletins.length === 0 ? (
          <p className="text-ink-muted">아직 올라온 주보가 없습니다.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-line border-y border-line p-0">
            {bulletins.map((b) => (
              <li key={b.id} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:gap-6">
                <span className="text-sm text-ink-muted sm:w-48">{formatLong(b.date)}</span>
                <div className="flex-1">
                  <p className="m-0 text-lg font-bold">{b.title}</p>
                  {b.note && <p className="m-0 text-[15px] text-ink-muted">{b.note}</p>}
                </div>
                {b.filePath ? (
                  <a href={b.filePath} target="_blank" rel="noopener noreferrer" className="text-[15px] font-medium">
                    {/\.pdf$/i.test(b.filePath) ? "PDF 열기" : "주보 보기"}
                  </a>
                ) : (
                  <span className="text-sm text-ink-muted">[파일 업로드 전]</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
