import { describe, expect, it } from "vitest";
import { parseSpecialDraft, seasonTextSchema } from "@/lib/banner-admin";
import { coveredSeasons, overlappingSpecials, resolveBanner, yearSchedule, type BannerRow } from "@/lib/main-banner";
import { sectionText } from "@/lib/main-sections";

let n = 0;
const row = (over: Partial<BannerRow>): BannerRow => ({
  id: `id-${++n}`,
  season: "special",
  kind: "special",
  title: "제목",
  eyebrow: null,
  description: "",
  primary_label: null,
  primary_href: null,
  publish_start: null,
  publish_end: null,
  sort: 0,
  status: "published",
  ...over,
});
const seoul = (s: string) => new Date(`${s}+09:00`);
/** '적용'을 켠 절기 행 (기본 문구 사본) */
const applied = (season: BannerRow["season"], over: Partial<BannerRow> = {}) => row({ kind: "season", season, status: "published", ...over });

describe("메인 배너 선택 (기획서 15.4)", () => {
  it("아무것도 없으면 그 절기의 기본 문구", () => {
    const b = resolveBanner([], seoul("2026-11-05T12:00:00"));
    expect(b).toMatchObject({ source: "default", seasonKey: "ordinary", title: "사랑과 나눔을\n배우고 실천합니다", primary: null });
  });

  it("절기는 기본이 '적용 안 함': 켜지 않으면 1년 내내 연중 배너를 유지한다", () => {
    for (let d = new Date("2026-01-01T12:00:00+09:00"); d < new Date("2028-01-01T00:00:00+09:00"); d = new Date(d.getTime() + 86_400_000)) {
      const b = resolveBanner([], d);
      expect(b.seasonKey).toBe("ordinary");
      expect(b.title).toBe("사랑과 나눔을\n배우고 실천합니다");
    }
  });

  it("켜지 않은 절기 기간에는 이유를 알려 준다", () => {
    const b = resolveBanner([], seoul("2026-12-01T09:00:00")); // 달력으로는 대림절
    expect(b).toMatchObject({ seasonKey: "ordinary", source: "default" });
    expect(b.reason).toMatch(/대림절 기간이지만 '적용'을 켜지 않아 연중 배너를 그대로 유지/);
  });

  it("켠 절기만 그 날짜에 적용되고, 해마다 반복된다", () => {
    const rows = [applied("advent"), applied("easter")];
    expect(resolveBanner(rows, seoul("2026-11-28T23:59:59")).seasonKey).toBe("ordinary");
    expect(resolveBanner(rows, seoul("2026-11-29T00:00:00")).seasonKey).toBe("advent");
    expect(resolveBanner(rows, seoul("2027-03-27T12:00:00")).seasonKey).toBe("ordinary"); // 부활절 전날은 고난주간(꺼 둠) → 연중
    expect(resolveBanner(rows, seoul("2027-03-28T12:00:00")).seasonKey).toBe("easter"); // 2027 부활절
    expect(resolveBanner(rows, seoul("2027-04-05T12:00:00")).seasonKey).toBe("easter");
    expect(resolveBanner(rows, seoul("2027-12-05T12:00:00")).seasonKey).toBe("advent"); // 다음 해에도
    // 끈 절기(성탄절)는 건너뛰고 연중으로
    expect(resolveBanner(rows, seoul("2026-12-26T12:00:00")).seasonKey).toBe("ordinary");
  });

  it("적용을 켜면서 만들어진 기본 문구 사본은 '고친 문구'로 세지 않는다", () => {
    const copy = applied("advent", { title: "소망으로\n기다리는 시간", description: "오실 주님을 기다리며, 우리의 마음에 소망의 빛을 밝힙니다." });
    const b = resolveBanner([copy], seoul("2026-12-01T09:00:00"));
    expect(b.source).toBe("default");
    expect(b.reason).toMatch(/기본 문구/);
    expect(resolveBanner([applied("advent", { title: "고친 대림절" })], seoul("2026-12-01T09:00:00")).source).toBe("season");
  });

  it("적용을 끄면 고친 문구를 남겨 두어도 쓰이지 않는다", () => {
    const off = applied("advent", { title: "고친 대림절", status: "unpublished" });
    expect(resolveBanner([off], seoul("2026-12-01T09:00:00"))).toMatchObject({ seasonKey: "ordinary", title: "사랑과 나눔을\n배우고 실천합니다" });
  });

  it("게시된 절기 문구가 있으면 그 문구, 임시 저장은 무시", () => {
    const rows = [
      row({ kind: "season", season: "advent", title: "고친 대림절", status: "published" }),
      row({ kind: "season", season: "ordinary", title: "임시 연중", status: "draft" }),
    ];
    expect(resolveBanner(rows, seoul("2026-12-01T09:00:00"))).toMatchObject({ source: "season", title: "고친 대림절" });
    expect(resolveBanner(rows, seoul("2026-11-05T09:00:00"))).toMatchObject({ source: "default", seasonKey: "ordinary" });
  });

  it("기간 안의 특별 배너가 가장 먼저, 끝나면 그때의 절기로 돌아간다", () => {
    const special = row({ title: "창립 40주년", primary_label: "행사 안내", primary_href: "/news/1", publish_start: "2026-11-20T00:00:00+09:00", publish_end: "2026-12-02T00:00:00+09:00" });
    const during = resolveBanner([special], seoul("2026-11-25T10:00:00"));
    expect(during).toMatchObject({ source: "special", title: "창립 40주년", eyebrow: "교회 소식", primary: { label: "행사 안내", href: "/news/1" } });
    // 시작 전에 보이던 연중이 아니라, 끝난 시점의 (적용한) 절기 대림절로
    expect(resolveBanner([special, applied("advent")], seoul("2026-12-02T00:00:00")).seasonKey).toBe("advent");
    expect(resolveBanner([special, applied("advent")], seoul("2026-11-25T10:00:00")).reason).toMatch(/끝나면 대림절 배너로/);
    // 대림절을 켜지 않았다면 연중으로
    expect(resolveBanner([special], seoul("2026-12-02T00:00:00")).seasonKey).toBe("ordinary");
    expect(resolveBanner([special], seoul("2026-11-25T10:00:00")).reason).toMatch(/끝나면 연중 배너로/);
  });

  it("다음 전환 시각은 절기 끝·특별 배너 시작·끝 중 가장 이른 것", () => {
    const special = row({ publish_start: "2026-11-20T00:00:00+09:00", publish_end: "2026-11-23T00:00:00+09:00" });
    expect(resolveBanner([special], seoul("2026-11-05T12:00:00")).nextChangeAt).toBe("2026-11-19T15:00:00.000Z");
    expect(resolveBanner([special], seoul("2026-11-21T12:00:00")).nextChangeAt).toBe("2026-11-22T15:00:00.000Z");
    // 대림절을 켰다면 11/29 시작, 켜지 않았다면 켠 절기가 없으니 그때까지 바뀌지 않는다
    expect(resolveBanner([applied("advent")], seoul("2026-11-21T12:00:00")).nextChangeAt).toBe("2026-11-28T15:00:00.000Z");
    expect(resolveBanner([], seoul("2026-11-21T12:00:00")).nextChangeAt).toBeNull();
  });

  it("다음 전환은 켜지 않은 절기를 건너뛰어 켠 절기의 시작을 가리킨다", () => {
    // 대림절·성탄절은 끄고 주현절만 켬 → 1/6 시작
    const rows = [applied("epiphany")];
    expect(resolveBanner(rows, seoul("2026-12-10T12:00:00")).nextChangeAt).toBe("2027-01-05T15:00:00.000Z");
    // 켠 절기 안에서는 그 절기의 끝: 주현절은 사순절이 시작되는 재의 수요일(2027-02-10) 직전까지
    expect(resolveBanner(rows, seoul("2027-01-10T12:00:00")).nextChangeAt).toBe("2027-02-09T15:00:00.000Z");
  });

  it("추수감사는 게시해 둔 경우에만 쓰고, 끝나면 대림절로 이어진다", () => {
    const tg = row({ kind: "season", season: "thanksgiving", title: "감사", status: "published" });
    expect(resolveBanner([], seoul("2026-11-10T12:00:00")).seasonKey).toBe("ordinary");
    expect(resolveBanner([tg], seoul("2026-11-10T12:00:00"))).toMatchObject({ seasonKey: "thanksgiving", title: "감사" });
    // 2026년 추수감사주일 11/15 → 11/16 00:00 종료
    expect(resolveBanner([tg], seoul("2026-11-15T23:59:59")).seasonKey).toBe("thanksgiving");
    expect(resolveBanner([tg], seoul("2026-11-16T00:00:00")).seasonKey).toBe("ordinary");
    expect(resolveBanner([tg], seoul("2026-11-29T00:00:00")).seasonKey).toBe("ordinary"); // 대림절은 켜지 않았으므로
    expect(resolveBanner([tg, applied("advent")], seoul("2026-11-29T00:00:00")).seasonKey).toBe("advent");
    const off = { ...tg, status: "unpublished" as const };
    expect(resolveBanner([off], seoul("2026-11-10T12:00:00")).seasonKey).toBe("ordinary");
  });
});

describe("특별 배너 기간 겹침", () => {
  const a = row({ title: "A", publish_start: "2026-11-20T00:00:00+09:00", publish_end: "2026-11-25T00:00:00+09:00" });
  it("겹치면 찾고, 맞닿기만 하면 겹치지 않는다", () => {
    expect(overlappingSpecials([a], { id: null, publish_start: "2026-11-24T00:00:00+09:00", publish_end: "2026-11-30T00:00:00+09:00" })).toHaveLength(1);
    expect(overlappingSpecials([a], { id: null, publish_start: "2026-11-25T00:00:00+09:00", publish_end: "2026-11-30T00:00:00+09:00" })).toHaveLength(0);
  });
  it("자기 자신·게시하지 않은 배너는 빼고, 시작이 비면 지금부터", () => {
    expect(overlappingSpecials([a], { id: a.id, publish_start: null, publish_end: "2026-12-30T00:00:00+09:00" })).toHaveLength(0);
    expect(overlappingSpecials([{ ...a, status: "draft" }], { id: null, publish_start: null, publish_end: "2026-12-30T00:00:00+09:00" })).toHaveLength(0);
    expect(overlappingSpecials([a], { id: null, publish_start: null, publish_end: "2026-11-21T00:00:00+09:00" }, seoul("2026-11-05T00:00:00"))).toHaveLength(1);
  });
});

describe("관리자 달력", () => {
  it("한 해를 빈틈없이 이어 덮는다 (성탄은 다음 해 1월 6일까지)", () => {
    for (const y of [2025, 2026, 2027, 2028, 2033]) {
      const s = yearSchedule(y, false);
      expect(s[0]).toMatchObject({ key: "epiphany", start: `${y}-01-06` });
      for (let i = 1; i < s.length; i++) expect(s[i].start).toBe(s[i - 1].end);
      expect(s.at(-1)).toMatchObject({ key: "christmas", start: `${y}-12-25`, end: `${y + 1}-01-06` });
    }
  });
  it("추수감사를 켜면 일정에 들어간다", () => {
    expect(yearSchedule(2026, true).find((s) => s.key === "thanksgiving")).toMatchObject({ start: "2026-11-01", end: "2026-11-16" });
  });
  it("특별 배너가 가리는 절기를 알려 준다", () => {
    const rows = [applied("holy-week"), applied("easter")];
    expect(coveredSeasons(rows, "2027-03-25T00:00:00+09:00", "2027-03-30T00:00:00+09:00")).toEqual(["고난주간", "부활절"]); // 2027 부활절 3/28, 고난주간 3/22~
    // 아무 절기도 켜지 않았다면 가리는 것은 연중뿐
    expect(coveredSeasons([], "2027-03-25T00:00:00+09:00", "2027-03-30T00:00:00+09:00")).toEqual(["연중"]);
  });
});

describe("입력 규칙", () => {
  const base = { eyebrow: "", title: "창립 40주년", description: "", primaryLabel: "", primaryHref: "", publishStart: "", publishEnd: "2026-12-01T00:00" };
  const now = new Date("2026-11-05T00:00:00Z");
  it("특별 배너는 끝나는 시각이 꼭 필요하다", () => {
    const r = parseSpecialDraft({ ...base, publishEnd: "" }, false, now);
    expect(!r.ok && r.fieldErrors.publishEnd).toMatch(/꼭/);
  });
  it("버튼은 글자와 주소를 함께, 주소는 사이트 안 경로나 https만", () => {
    const half = parseSpecialDraft({ ...base, primaryLabel: "신청" }, false, now);
    expect(!half.ok && half.fieldErrors.primaryHref).toBeTruthy();
    expect(parseSpecialDraft({ ...base, primaryLabel: "신청", primaryHref: "javascript:alert(1)" }, false, now).ok).toBe(false);
    expect(parseSpecialDraft({ ...base, primaryLabel: "신청", primaryHref: "/news/abc" }, false, now).ok).toBe(true);
  });
  it("이미 끝난 기간은 게시할 수 없다", () => {
    const r = parseSpecialDraft({ ...base, publishEnd: "2026-11-01T00:00" }, true, now);
    expect(!r.ok && r.fieldErrors.publishEnd).toMatch(/지났/);
  });
  it("헤드라인은 두 줄까지", () => {
    expect(seasonTextSchema.safeParse({ title: "한\n두\n세", description: "" }).success).toBe(false);
  });
});

it("구역 문구: 비우면 기본 문구", () => {
  expect(sectionText({ key: "news", isVisible: true, headline: " ", body: "" }, "news").headline).toBe("이번 주 알려드립니다");
  expect(sectionText({ key: "news", isVisible: true, headline: "교회 소식", body: "" }, "news").headline).toBe("교회 소식");
});
