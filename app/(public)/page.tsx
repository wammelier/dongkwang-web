import type { ReactNode } from "react";
import { SeasonBanner } from "@/components/SeasonBanner";
import {
  AboutSummary,
  CommunityChips,
  NewsCards,
  RecentSermon,
  WelcomeSteps,
  WorshipStrip,
} from "@/components/sections";
import { sectionText, type SectionKey } from "@/lib/main-sections";
import {
  getBulletins,
  getChurchInfo,
  getCommunities,
  getMainNews,
  getMainSections,
  getMainWorship,
  getSermons,
} from "@/lib/queries";

// 절기 배너가 서울 자정에 정확히 바뀌도록 요청마다 렌더링 (기획서 15.5)
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [church, worship, bulletins, sermons, news, communities, sections] = await Promise.all([
    getChurchInfo(),
    getMainWorship(),
    getBulletins(),
    getSermons(),
    getMainNews(3),
    getCommunities(),
    getMainSections(),
  ]);
  const bulletin = bulletins[0] ?? null;

  // 비어 있는 구역은 null → 렌더링하지 않는다 (계획서 6.1)
  // 관리자가 고친 구역 제목·소개 (비우면 기본 문구)
  const text = (key: SectionKey) => sectionText(sections.find((s) => s.key === key), key);
  const render: Record<SectionKey, () => ReactNode> = {
    welcome: () => <WelcomeSteps steps={church.welcomeSteps} {...text("welcome")} />,
    about: () => <AboutSummary values={church.values} {...text("about")} />,
    sermon: () => (sermons[0] ? <RecentSermon sermon={sermons[0]} /> : null),
    news: () => (news.length > 0 || bulletin ? <NewsCards posts={news} bulletin={bulletin} {...text("news")} /> : null),
    community: () => (communities.length > 0 ? <CommunityChips communities={communities} {...text("community")} /> : null),
  };

  return (
    <>
      {/* 고정 구역: 절기 배너와 예배·방문 핵심 정보 (기획서 4장) */}
      <SeasonBanner />
      <WorshipStrip worship={worship} church={church} bulletin={bulletin} />
      {/* 관리자가 정한 순서와 노출 여부 */}
      <div className="divide-y divide-line">
        {sections
          .filter((s) => s.isVisible)
          .map((s) => {
            const node = render[s.key]();
            return node ? <div key={s.key}>{node}</div> : null;
          })}
      </div>
    </>
  );
}
