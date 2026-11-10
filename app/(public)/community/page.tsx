import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { getChurchInfo, getCommunities } from "@/lib/queries";

export const metadata: Metadata = { title: "다음세대·공동체", description: "영유아부터 장년까지 동광교회의 모임 안내" };

export default async function CommunityPage() {
  const [communities, church] = await Promise.all([getCommunities(), getChurchInfo()]);

  return (
    <>
      <PageHeader
        eyebrow="다음세대·공동체"
        title="작지만 모두의 자리가 있습니다"
        description="나와 가족이 함께할 모임을 찾아보세요."
      />
      <Container className="grid grid-cols-1 gap-5 py-9 sm:py-14 md:grid-cols-2">
        {communities.map((c) => (
          <article id={c.id} key={c.id} className="scroll-mt-20 rounded-card border border-line border-t-[3px] border-t-accent p-5 sm:scroll-mt-28 sm:p-6">
            <h2 className="m-0 text-xl font-bold sm:text-[22px]">{c.name}</h2>
            <p className="m-0 mt-1 text-[15px] text-ink-muted">{c.target} · {c.ageRange}</p>
            <dl className="mt-3 grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-[15px] sm:mt-4 sm:grid-cols-[88px_1fr] sm:gap-y-2">
              <dt className="text-ink-muted">모임 시간</dt>
              <dd className="m-0">{c.meetTime}</dd>
              <dt className="text-ink-muted">장소</dt>
              <dd className="m-0">{c.place}</dd>
              <dt className="text-ink-muted">주요 활동</dt>
              <dd className="m-0">{c.activities}</dd>
              <dt className="text-ink-muted">처음 참여</dt>
              <dd className="m-0">{c.howToJoin}</dd>
            </dl>
          </article>
        ))}
      </Container>
      <Container className="pb-16">
        <p className="m-0 text-[15px] text-ink-muted">문의: 교회 사무실 {church.phone} ({church.officeHours})</p>
      </Container>
    </>
  );
}
