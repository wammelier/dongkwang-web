import type { Metadata } from "next";
import Image from "next/image";
import { ValueCards } from "@/components/sections";
import { Container, PageHeader, SectionHeading } from "@/components/ui";
import { getChurchInfo } from "@/lib/queries";

export const metadata: Metadata = {
  title: "교회 소개",
  description: "동광교회의 신앙과 방향, 담임목사 인사, 섬기는 사람들, 연혁",
};

export default async function AboutPage() {
  const church = await getChurchInfo();

  return (
    <>
      <PageHeader eyebrow="교회 소개" title="사랑과 나눔을 배우고 실천하는 교회" description={church.intro} />

      <section aria-labelledby="values" className="bg-white">
        <Container className="flex flex-col gap-6 sm:gap-8 py-11 sm:py-16">
          <SectionHeading eyebrow="핵심 가치" title={<span id="values">우리는 이렇게 믿고, 이렇게 살아갑니다</span>} />
          <ValueCards values={church.values} />
        </Container>
      </section>

      <section aria-labelledby="faith" className="border-t border-line bg-white">
        <Container className="grid items-center gap-6 sm:gap-10 py-11 sm:py-16 lg:grid-cols-2">
          <SectionHeading
            eyebrow="신앙과 소속"
            title={<span id="faith">{church.denomination}</span>}
            description="[교단 내 소속 노회·신앙고백 등 확인 후 입력]"
          />
          <div className="relative h-[260px] overflow-hidden rounded-card">
            <Image
              src="/photos/sanctuary.jpg"
              alt="동광교회 예배당 강단"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </div>
        </Container>
      </section>

      <section aria-labelledby="greeting" className="border-t border-line bg-white">
        <Container className="flex flex-col gap-6 py-11 sm:py-16">
          <SectionHeading eyebrow="담임목사 인사" title={<span id="greeting">함께 걸어가는 교회가 되겠습니다</span>} />
          <div className="max-w-[720px] whitespace-pre-line text-ink-muted">{church.pastorGreeting.body}</div>
          <p className="m-0 font-bold">{church.pastorGreeting.name} 목사</p>
        </Container>
      </section>

      <section aria-labelledby="staff" className="border-t border-line bg-white">
        <Container className="flex flex-col gap-6 py-11 sm:py-16">
          <SectionHeading eyebrow="섬기는 사람들" title={<span id="staff">함께 섬기는 사람들</span>} />
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
            {church.staff.map((s) => (
              <li key={s.role} className="rounded-card border border-line px-5 py-4">
                <p className="m-0 text-sm text-ink-muted">{s.role}</p>
                <p className="m-0 text-lg font-bold">{s.name}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="history" className="border-t border-line bg-white">
        <Container className="flex flex-col gap-6 py-11 sm:py-16">
          <SectionHeading eyebrow="연혁" title={<span id="history">걸어온 길</span>} />
          <ol className="m-0 flex list-none flex-col border-l-2 border-accent p-0 pl-6">
            {church.history.map((h) => (
              <li key={h.year + h.text} className="py-2">
                <span className="mr-4 font-bold text-primary">{h.year}</span>
                {h.text}
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}
