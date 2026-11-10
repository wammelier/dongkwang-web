import type { Metadata } from "next";
import { StepList } from "@/components/sections";
import { Container, ExternalButton, IconTile, Icons, PageHeader, SectionHeading } from "@/components/ui";
import { getChurchInfo, getFaqs, getMainWorship } from "@/lib/queries";

export const metadata: Metadata = {
  title: "처음 오셨나요",
  description: "동광교회 첫 방문 안내, 오시는 길, 주차·대중교통, 자녀 동반, 자주 묻는 질문",
};

export default async function VisitPage() {
  const [church, faqs, worship] = await Promise.all([getChurchInfo(), getFaqs(), getMainWorship()]);

  const ways = [
    { icon: Icons.pin, label: "주소", value: church.address },
    { icon: Icons.car, label: "주차", value: `${church.parking.headline} · ${church.parking.detail}` },
    { icon: Icons.bus, label: "대중교통", value: church.transit },
    { icon: Icons.walk, label: "이동 편의", value: church.accessibility },
  ];

  return (
    <>
      <PageHeader
        eyebrow="처음 오셨나요"
        title="문 앞에서부터 함께 걸어 드립니다"
        description={`등록이나 준비 없이 오셔도 됩니다.${worship ? ` ${worship.name}는 ${worship.weekday} ${worship.startTime}, ${worship.place}에서 드립니다.` : ""}`}
      />

      <section aria-labelledby="steps" className="bg-white">
        <Container className="grid gap-6 sm:gap-10 py-11 sm:py-16 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="방문 과정" title={<span id="steps">이렇게 안내해 드립니다</span>} />
          <StepList steps={church.visitSteps} />
        </Container>
      </section>

      <section aria-labelledby="kids" className="border-t border-line bg-white">
        <Container className="grid gap-6 sm:gap-10 py-11 sm:py-16 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="자녀 동반" title={<span id="kids">아이와 함께 오셔도 괜찮습니다</span>} />
          <p className="m-0 text-ink-muted">
            아이 소리가 나도 괜찮은 예배입니다. 영유아부와 어린이부가 주일예배 시간에 함께 모입니다. [자녀 예배실 위치와 이용 방법]
          </p>
        </Container>
      </section>

      <section id="map" aria-labelledby="map-title" className="scroll-mt-24 border-t border-line bg-white">
        <Container className="flex flex-col gap-6 sm:gap-8 py-11 sm:py-16">
          <SectionHeading eyebrow="오시는 길" title={<span id="map-title">교회 찾아오기</span>} />
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            {ways.map((w) => (
              <div key={w.label} className="flex gap-3.5">
                <IconTile>{w.icon}</IconTile>
                <div>
                  <p className="m-0 text-sm text-ink-muted">{w.label}</p>
                  <p className="m-0 font-bold">{w.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex h-[200px] items-center sm:h-[280px] justify-center rounded-card border border-dashed border-line bg-accent-soft text-center text-ink-muted">
            [교회 주소 확정 후 지도 연결]
          </div>
          <div className="flex flex-wrap gap-3">
            <ExternalButton href={church.mapUrl} fallback="">
              지도 앱에서 길찾기
            </ExternalButton>
          </div>
        </Container>
      </section>

      {faqs.length > 0 && (
        <section aria-labelledby="faq" className="border-t border-line bg-white">
          <Container className="flex flex-col gap-6 py-11 sm:py-16">
            <SectionHeading eyebrow="자주 묻는 질문" title={<span id="faq">궁금하신 점</span>} />
            <div className="divide-y divide-line border-y border-line">
              {faqs.map((f) => (
                <details key={f.id} className="group py-1">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 text-base font-bold sm:text-[17px]">
                    {f.question}
                    <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="m-0 pb-5 text-ink-muted">{f.answer}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section aria-labelledby="contact" className="border-t border-line bg-white">
        <Container className="flex flex-col gap-4 py-11 sm:py-16">
          <SectionHeading eyebrow="문의" title={<span id="contact">편하게 연락 주세요</span>} />
          <p className="m-0 flex items-center gap-3 text-lg">
            <IconTile>{Icons.phone}</IconTile>
            <span>
              <strong>{church.phone}</strong>
              <span className="ml-2 text-[15px] text-ink-muted">사무실 {church.officeHours}</span>
            </span>
          </p>
        </Container>
      </section>
    </>
  );
}
