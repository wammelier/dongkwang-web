import { resolveBanner } from "@/lib/main-banner";
import { getBannerRows } from "@/lib/queries";
import { BannerView } from "./BannerView";
import { SeasonWatcher } from "./SeasonWatcher";

/**
 * 메인 배너 (기획서 15장): 서버 시각을 Asia/Seoul로 바꿔 특별 배너 → 추수감사 → 절기 문구 → 기본 문구 순으로 고른다.
 * 열어 둔 화면은 다음 전환 시각에 다시 받는다.
 */
export async function SeasonBanner({ now = new Date() }: { now?: Date }) {
  const banner = resolveBanner(await getBannerRows(), now);
  return (
    <>
      <SeasonWatcher nextChangeAt={banner.nextChangeAt} />
      <BannerView banner={banner} />
    </>
  );
}
