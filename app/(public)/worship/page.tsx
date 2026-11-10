import type { Metadata } from "next";
import { RecentSermon } from "@/components/sections";
import { Container, ExternalButton, PageHeader, SectionHeading } from "@/components/ui";
import { getChurchInfo, getSermons, getWorshipTimes } from "@/lib/queries";

export const metadata: Metadata = { title: "예배 안내", description: "동광교회 예배 시간과 장소, 온라인 예배 안내" };

export default async function WorshipPage() {
  const [times, sermons, church] = await Promise.all([getWorshipTimes(), getSermons(), getChurchInfo()]);
  const youtube = church.channels.find((c) => c.label === "유튜브")?.href ?? null;

  return (
    <>
      <PageHeader eyebrow="예배·말씀" title="예배 시간과 장소" description="처음 오시는 분도 편하게 함께하실 수 있습니다." />

      <section aria-label="예배 시간표" className="bg-white">
        <Container className="py-9 sm:py-14">
          {/* 모바일: 표 대신 예배별 카드 (가로 스크롤 없이 시간이 먼저 보이게) */}
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 md:hidden">
            {times.map((w) => (
              <li key={w.id} className="rounded-card border border-line p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="m-0 text-[17px] font-bold">{w.name}</p>
                  <p className="m-0 text-[17px] font-bold whitespace-nowrap text-primary">{w.startTime}</p>
                </div>
                <p className="m-0 mt-1 text-sm text-ink-muted">
                  {w.weekday} · {w.place} · {w.target}
                  {w.isOnline && " · 온라인 중계"}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-card border border-line md:block">
            <table className="w-full min-w-[560px] border-collapse text-left text-[16px]">
              <thead className="bg-accent-soft text-sm text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">예배</th>
                  <th scope="col" className="px-5 py-3 font-medium">대상</th>
                  <th scope="col" className="px-5 py-3 font-medium">요일·시간</th>
                  <th scope="col" className="px-5 py-3 font-medium">장소</th>
                  <th scope="col" className="px-5 py-3 font-medium">온라인</th>
                </tr>
              </thead>
              <tbody>
                {times.map((w) => (
                  <tr key={w.id} className="border-t border-line">
                    <th scope="row" className="px-5 py-4 font-bold">{w.name}</th>
                    <td className="px-5 py-4">{w.target}</td>
                    <td className="px-5 py-4">{w.weekday} {w.startTime}</td>
                    <td className="px-5 py-4">{w.place}</td>
                    <td className="px-5 py-4">{w.isOnline ? "함께 중계" : "현장 예배"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-ink-muted">특별예배나 시간 변경은 교회 소식의 공지로 안내합니다.</p>
        </Container>
      </section>

      <section aria-labelledby="online" className="border-t border-line bg-white">
        <Container className="flex flex-col gap-5 py-9 sm:py-14">
          <SectionHeading
            eyebrow="온라인 예배"
            title={<span id="online">집에서도 함께 예배드릴 수 있습니다</span>}
            description="설교 영상은 교회 공식 영상 채널에 올라갑니다."
          />
          <div>
            <ExternalButton href={youtube} fallback="[공식 영상 채널 주소 확정 후 연결]">
              유튜브 채널 열기
            </ExternalButton>
          </div>
        </Container>
      </section>

      {sermons[0] && (
        <div className="border-t border-line">
          <RecentSermon sermon={sermons[0]} imagePriority />
        </div>
      )}
    </>
  );
}
