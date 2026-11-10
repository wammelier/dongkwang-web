import { describe, expect, it } from "vitest";
import { normalizeSections } from "@/lib/main-sections";

describe("메인 구역 정렬", () => {
  it("sort 순서대로 정렬하고 노출 여부를 유지한다", () => {
    const result = normalizeSections([
      { key: "news", is_visible: true, sort: 2 },
      { key: "about", is_visible: false, sort: 1 },
      { key: "welcome", is_visible: true, sort: 3 },
      { key: "sermon", is_visible: true, sort: 4 },
      { key: "community", is_visible: true, sort: 5 },
    ]);
    expect(result.map((s) => s.key)).toEqual(["about", "news", "welcome", "sermon", "community"]);
    expect(result[0].isVisible).toBe(false);
  });

  it("빠진 구역은 켜진 상태로 끝에 붙이고 모르는 키는 버린다", () => {
    const result = normalizeSections([
      { key: "news", is_visible: false, sort: 1 },
      { key: "unknown", is_visible: true, sort: 0 },
    ]);
    expect(result.map((s) => s.key)).toEqual(["news", "welcome", "about", "sermon", "community"]);
    expect(result.slice(1).every((s) => s.isVisible)).toBe(true);
  });
});
