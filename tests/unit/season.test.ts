import { describe, expect, it } from "vitest";
import {
  adventSunday,
  calendar,
  currentSeason,
  easter,
  iso,
  selectSeason,
  seoulToday,
} from "@/lib/season";

describe("부활절·대림절 계산", () => {
  it.each([
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2038, "2038-04-25"],
    [2285, null],
  ])("%i년 부활절", (year, expected) => {
    if (expected === null) return expect(() => calendar(year)).toThrow();
    expect(iso(easter(year))).toBe(expected);
  });

  it("성탄절이 일요일인 해(2022)는 당일을 세지 않는다", () => {
    expect(iso(adventSunday(2022))).toBe("2022-11-27");
  });

  it.each([
    [2026, "2026-11-29"],
    [2027, "2027-11-28"],
    [2028, "2028-12-03"],
  ])("%i년 대림절 첫 주일", (year, expected) => {
    expect(iso(adventSunday(year))).toBe(expected);
  });
});

describe("배너 선택", () => {
  it.each([
    ["2026-11-04", "ordinary"],
    ["2026-11-28", "ordinary"],
    ["2026-11-29", "advent"],
    ["2026-12-24", "advent"],
    ["2026-12-25", "christmas"],
    ["2026-12-31", "christmas"],
    ["2027-01-01", "christmas"],
    ["2027-01-05", "christmas"],
    ["2027-01-06", "epiphany"],
    ["2026-02-17", "epiphany"],
    ["2026-02-18", "lent"],
    ["2026-03-29", "palm-sunday"],
    ["2026-03-30", "holy-week"],
    ["2026-04-04", "holy-week"],
    ["2026-04-05", "easter"],
    ["2026-05-24", "pentecost"],
    ["2026-05-31", "ordinary"],
    ["2028-02-29", "epiphany"],
    ["2028-03-01", "lent"],
  ])("%s → %s", (date, key) => {
    expect(selectSeason(date).key).toBe(key);
  });

  it("성탄 기간은 연도를 넘어 12/25~1/6로 표시된다", () => {
    expect(selectSeason("2027-01-02")).toMatchObject({ start: "2026-12-25", end: "2027-01-06" });
    expect(selectSeason("2026-12-30")).toMatchObject({ start: "2026-12-25", end: "2027-01-06" });
  });

  it("추수감사는 설정했을 때만 11월 셋째 일요일 14일 전부터 다음 날까지", () => {
    expect(selectSeason("2026-11-04").key).toBe("ordinary");
    expect(selectSeason("2026-10-31", { thanksgiving: true }).key).toBe("ordinary");
    expect(selectSeason("2026-11-01", { thanksgiving: true }).key).toBe("thanksgiving");
    expect(selectSeason("2026-11-15", { thanksgiving: true })).toMatchObject({ end: "2026-11-16" });
    expect(selectSeason("2026-11-16", { thanksgiving: true }).key).toBe("ordinary");
  });

  it("2026~2035년 기본 일정은 빈틈·겹침 없이 이어진다", () => {
    for (let y = 2026; y <= 2035; y++) {
      const ranges = calendar(y);
      expect(ranges[0].start).toBe(`${y}-01-01`);
      expect(ranges.at(-1)!.end).toBe(`${y + 1}-01-01`);
      ranges.forEach((r, i) => {
        expect(r.start < r.end).toBe(true);
        if (i > 0) expect(r.start).toBe(ranges[i - 1].end);
      });
    }
  });

  it("잘못된 날짜는 거부한다", () => {
    expect(() => selectSeason("2026-02-30")).toThrow();
    expect(() => selectSeason("2026/11/04")).toThrow();
  });
});

describe("한국 시간 기준", () => {
  it("서울 자정에 날짜가 바뀐다", () => {
    expect(seoulToday(new Date("2026-11-28T14:59:59Z"))).toBe("2026-11-28");
    expect(seoulToday(new Date("2026-11-28T15:00:00Z"))).toBe("2026-11-29");
  });

  it("대림절 전환 직전과 직후", () => {
    expect(currentSeason(new Date("2026-11-28T14:59:59Z")).key).toBe("ordinary");
    expect(currentSeason(new Date("2026-11-28T15:00:00Z")).key).toBe("advent");
  });

  it("다음 전환 시각은 서울 자정", () => {
    expect(currentSeason(new Date("2026-11-04T03:00:00Z")).nextChangeAt).toBe("2026-11-28T15:00:00.000Z");
  });
});
