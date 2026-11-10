// 메인 배너 선택 (기획서 15.4). 공개 페이지와 관리자 날짜별 미리보기가 같은 함수를 쓴다.
// 1) 게시 중이고 기간 안인 특별 배너 → 2) '적용'을 켠 절기의 배너 → 3) 기본(연중) 배너
// 절기는 기본적으로 모두 꺼져 있다. 켜지 않은 절기 날짜에는 연중 배너를 그대로 유지한다.
import { banners as defaults } from "./banners";
import { formatMonthDay } from "./date";
import { calendar, iso, selectSeason, seoulMidnight, seoulToday, thanksgivingSunday, type SeasonKey } from "./season";
import type { Status } from "./types";

export type BannerRow = {
  id: string;
  season: SeasonKey | "special";
  kind: "season" | "special";
  title: string;
  eyebrow: string | null;
  description: string;
  primary_label: string | null;
  primary_href: string | null;
  publish_start: string | null;
  publish_end: string | null;
  sort: number;
  status: Status;
};

export type ResolvedBanner = {
  source: "special" | "season" | "default";
  seasonKey: SeasonKey;
  seasonName: string;
  eyebrow: string;
  title: string;
  description: string;
  /** 특별 배너의 행사 버튼 (없으면 기본 버튼만) */
  primary: { label: string; href: string } | null;
  reason: string;
  /** 다음에 배너가 바뀔 수 있는 시각 (적용한 절기 전환·특별 배너 시작/종료 중 가장 이른 것) */
  /** 바뀔 일정이 없으면(적용한 절기도 예약된 특별 배너도 없을 때) null */
  nextChangeAt: string | null;
  specialId: string | null;
};

const live = (r: BannerRow, now: Date) =>
  r.status === "published" &&
  (!r.publish_start || new Date(r.publish_start) <= now) &&
  (!r.publish_end || new Date(r.publish_end) > now);

/**
 * 절기 '적용' 여부. 연중은 기본 배너라 늘 적용이고, 나머지는 그 절기의 행이 '게시' 상태일 때만 적용이다.
 * (행이 없거나 임시 저장·게시 중단이면 적용 안 함 = 연중 배너 유지)
 */
export const isSeasonApplied = (rows: BannerRow[], key: SeasonKey) =>
  key === "ordinary" || rows.some((r) => r.kind === "season" && r.season === key && r.status === "published");

/** 추수감사 배너는 적용해 두면 '사용', 아니면 '사용 안 함' (기획서 15.3: 교회가 활성화) */
export const thanksgivingEnabled = (rows: BannerRow[]) => isSeasonApplied(rows, "thanksgiving");

/** 그날 메인에 쓸 절기: 적용한 절기면 그 절기, 아니면 연중 */
function effectiveSeason(rows: BannerRow[], date: string) {
  const selection = selectSeason(date, { thanksgiving: thanksgivingEnabled(rows) });
  const applied = isSeasonApplied(rows, selection.key);
  return { selection, applied, key: (applied ? selection.key : "ordinary") as SeasonKey };
}

/** 절기 때문에 배너가 다음에 바뀌는 시각. 켜지 않은 절기는 건너뛴다 */
function nextSeasonChange(rows: BannerRow[], from: string): string | null {
  const first = effectiveSeason(rows, from);
  const key = first.key;
  let selection = first.selection;
  for (let i = 0; i < 40; i++) {
    const next = effectiveSeason(rows, selection.end);
    if (next.key !== key) return seoulMidnight(selection.end).toISOString();
    selection = next.selection;
  }
  return null; // 앞으로 몇 해 동안 바뀔 절기가 없다 (적용한 절기가 없을 때)
}

export function resolveBanner(rows: BannerRow[], now: Date = new Date()): ResolvedBanner {
  const today = seoulToday(now);
  const { selection, applied, key } = effectiveSeason(rows, today);
  const seasonName = defaults[key].name;

  // 다음 전환: 적용한 절기의 끝, 지금 특별 배너의 끝, 아직 시작 전인 특별 배너의 시작
  const seasonChange = nextSeasonChange(rows, today);
  const changes: string[] = seasonChange ? [seasonChange] : [];
  for (const r of rows) {
    if (r.kind !== "special" || r.status !== "published") continue;
    if (r.publish_start && new Date(r.publish_start) > now) changes.push(new Date(r.publish_start).toISOString());
    if (r.publish_end && new Date(r.publish_end) > now) changes.push(new Date(r.publish_end).toISOString());
  }
  const nextChangeAt = changes.sort()[0] ?? null;

  const special = rows
    .filter((r) => r.kind === "special" && live(r, now))
    .sort((a, b) => a.sort - b.sort || (b.publish_start ?? "").localeCompare(a.publish_start ?? ""))[0];
  if (special) {
    // 끝나면 돌아갈 배너: 끝나는 날의 (적용한) 절기
    const after = defaults[effectiveSeason(rows, seoulToday(new Date(special.publish_end!))).key].name;
    return {
      source: "special",
      seasonKey: key,
      seasonName,
      eyebrow: special.eyebrow?.trim() || "교회 소식",
      title: special.title,
      description: special.description,
      primary: special.primary_label && special.primary_href ? { label: special.primary_label, href: special.primary_href } : null,
      // 끝 시각은 미포함이라 그 직전 순간의 날짜를 '까지'로 보여 준다 (23일 0시 종료 → 22일까지)
      reason: `특별 배너 게시 중 (${formatMonthDay(new Date(new Date(special.publish_end!).getTime() - 1).toISOString())}까지, 끝나면 ${after} 배너로 돌아감)`,
      nextChangeAt,
      specialId: special.id,
    };
  }

  const eyebrow =
    key === "ordinary" ? `${seasonName} · 사랑과 나눔의 시간` : `${selection.start.slice(0, 4)} ${seasonName} · ${formatMonthDay(selection.start)}부터`;
  const custom = rows.find((r) => r.kind === "season" && r.season === key && live(r, now));
  // 적용을 켜면 기본 문구 사본 행이 만들어지므로, 실제로 문구가 다를 때만 '고친 문구'로 본다
  const edited = Boolean(custom && (custom.title !== defaults[key].title || custom.description !== defaults[key].description));
  const reason = applied
    ? `${selection.reason}${key === "ordinary" ? "" : " · 적용한 절기"} · ${edited ? "고친 문구" : "기본 문구"}`
    : `달력으로는 ${defaults[selection.key].name} 기간이지만 '적용'을 켜지 않아 연중 배너를 그대로 유지합니다`;
  return {
    source: edited ? "season" : "default",
    seasonKey: key,
    seasonName,
    eyebrow,
    title: custom?.title || defaults[key].title,
    description: custom?.description || defaults[key].description,
    primary: null,
    reason,
    nextChangeAt,
    specialId: null,
  };
}

/** 특별 배너 기간 겹침 (기획서 15.4: 저장 시 차단하고 겹치는 일정을 보여준다). 시작이 비면 '지금부터' */
export function overlappingSpecials(
  rows: BannerRow[],
  candidate: { id: string | null; publish_start: string | null; publish_end: string },
  now: Date = new Date(),
) {
  const start = (r: { publish_start: string | null }) => (r.publish_start ? new Date(r.publish_start) : now).getTime();
  return rows.filter(
    (r) =>
      r.kind === "special" &&
      r.status === "published" &&
      r.id !== candidate.id &&
      r.publish_end &&
      start(r) < new Date(candidate.publish_end).getTime() &&
      start(candidate) < new Date(r.publish_end).getTime(),
  );
}

export type ScheduleItem = { key: SeasonKey; name: string; start: string; end: string };

/** 그 해의 배너 일정 (관리자 달력). end는 다음 배너 시작일(미포함), 성탄은 다음 해 1월 6일까지 */
export function yearSchedule(y: number, thanksgiving: boolean): ScheduleItem[] {
  const items: ScheduleItem[] = calendar(y)
    .filter((r, i) => !(i === 0 && r.key === "christmas")) // 1월 1~5일은 전년 성탄의 이어짐
    .map((r) => ({ key: r.key, name: defaults[r.key].name, start: r.start, end: r.key === "christmas" ? `${y + 1}-01-06` : r.end }));
  if (thanksgiving) {
    const t = thanksgivingSunday(y);
    const day = 86_400_000;
    const start = iso(new Date(t.getTime() - 14 * day));
    const end = iso(new Date(t.getTime() + day));
    items.push({ key: "thanksgiving", name: defaults.thanksgiving.name, start, end });
    items.sort((a, b) => a.start.localeCompare(b.start));
  }
  return items;
}

/** 특별 배너 기간 동안 가려지는 절기 이름 (중요한 절기와 겹치면 관리자에게 알림, 기획서 15.4) */
export function coveredSeasons(rows: BannerRow[], startIso: string | null, endIso: string, now = new Date()) {
  const start = startIso ? new Date(startIso) : now;
  const end = new Date(endIso);
  const names = new Set<string>();
  // 적용하지 않은 절기는 원래 연중 배너가 보이는 기간이라 연중으로 센다
  const nameAt = (t: number) => defaults[effectiveSeason(rows, seoulToday(new Date(t))).key].name;
  for (let t = start.getTime(), n = 0; t < end.getTime() && n < 400; t += 86_400_000, n++) names.add(nameAt(t));
  names.add(nameAt(end.getTime() - 1));
  return [...names];
}

export const IMPORTANT_SEASONS = ["종려주일", "고난주간", "부활절", "성탄절", "성령강림절"];
