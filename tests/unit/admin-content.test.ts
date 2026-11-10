import { describe, expect, it } from "vitest";
import { parseBulletinDraft, suggestBulletinTitle, upcomingSunday } from "@/lib/bulletins";
import { parseChurchInfo, parseList } from "@/lib/church-info";
import { checkFile, isStoragePath } from "@/lib/files";
import { statusAfter } from "@/lib/posts";
import { parseSermonDraft, preacherLabel } from "@/lib/sermons";

const PATH = "bulletins/0b0e8a9e-3a8f-4c55-9d7a-0d2a5f6c1e11.pdf";

describe("주보", () => {
  it("한국 날짜 기준 다가오는 주일 (주일 당일은 그날)", () => {
    expect(upcomingSunday(new Date("2026-11-04T03:00:00Z"))).toBe("2026-11-08"); // 수요일
    expect(upcomingSunday(new Date("2026-11-07T16:00:00Z"))).toBe("2026-11-08"); // 한국은 이미 주일 새벽 1시
    expect(upcomingSunday(new Date("2026-11-08T14:00:00Z"))).toBe("2026-11-08"); // 주일 밤 11시
  });

  it("그 달 몇 번째 주일인지로 제목을 제안한다", () => {
    expect(suggestBulletinTitle("2026-11-01")).toBe("11월 첫째 주 주보");
    expect(suggestBulletinTitle("2026-11-29")).toBe("11월 다섯째 주 주보");
    expect(suggestBulletinTitle("")).toBe("");
  });

  it("게시하려면 파일이 필요하고, 저장 위치는 우리가 만든 형식만 받는다", () => {
    const base = { date: "2026-11-08", title: "11월 둘째 주 주보", note: "", filePath: "" };
    expect(parseBulletinDraft(base, false).ok).toBe(true);
    const noFile = parseBulletinDraft(base, true);
    expect(!noFile.ok && noFile.fieldErrors.filePath).toBeTruthy();
    expect(parseBulletinDraft({ ...base, filePath: PATH }, true).ok).toBe(true);
    expect(parseBulletinDraft({ ...base, filePath: "../../etc/passwd" }, false).ok).toBe(false);
  });
});

describe("설교", () => {
  it("이름만 쓰면 '목사'를 붙이고 직함을 쓴 경우는 그대로", () => {
    expect(preacherLabel("홍길동")).toBe("홍길동 목사");
    expect(preacherLabel("김철수 선교사")).toBe("김철수 선교사");
    expect(preacherLabel("")).toBe("");
  });

  it("영상 링크는 http(s)만, 게시할 때는 설교자 필수", () => {
    const base = { title: "서로 사랑하라", scripture: "", preacher: "", preachedOn: "2026-11-01", videoUrl: "", summary: "" };
    expect(parseSermonDraft({ ...base, videoUrl: "youtube.com/x" }, false).ok).toBe(false);
    const r = parseSermonDraft(base, true);
    expect(!r.ok && r.fieldErrors.preacher).toBeTruthy();
    const ok = parseSermonDraft({ ...base, preacher: "홍길동", videoUrl: "https://youtu.be/x" }, true);
    expect(ok.ok && ok.values).toMatchObject({ preached_on: "2026-11-01", video_url: "https://youtu.be/x" });
  });
});

describe("교회 정보", () => {
  it("빈 지도·채널 주소는 null로 저장한다", () => {
    const r = parseChurchInfo("basic", {
      name: "동광교회", name_en: "", denomination: "", address: "", phone: "", office_hours: "", map_url: "",
      channels: [{ label: "유튜브", href: "" }],
    });
    expect(r.ok && r.values).toMatchObject({ map_url: null, channels: [{ label: "유튜브", href: null }] });
  });

  it("목록 오류는 몇 번째 항목의 어느 칸인지 알려 준다", () => {
    const r = parseChurchInfo("about", {
      intro: "", pastor_name: "", pastor_greeting: "", values: [], history: [],
      staff: [{ role: "장로", name: "김" }, { role: "", name: "이" }],
    });
    expect(!r.ok && r.fieldErrors["staff.1.role"]).toMatch(/직분/);
  });

  it("목록은 화면 순서대로 sort를 매기고, 대표 예배는 하나만", () => {
    const w = { id: null, name: "주일예배", target: "", weekday: 0, start_time: "11:00", place: "", is_online: false, is_main: true, is_active: true };
    const ok = parseList("worship", [w, { ...w, name: "수요예배", weekday: 3, is_main: false }]);
    expect(ok.ok && ok.items.map((i) => i.sort)).toEqual([1, 2]);
    const two = parseList("worship", [w, { ...w, name: "둘" }]);
    expect(!two.ok && two.fieldErrors.items).toMatch(/하나만/);
    const bad = parseList("faq", [{ id: null, question: "", answer: "", is_active: true }]);
    expect(!bad.ok && bad.fieldErrors["items.0.question"]).toBeTruthy();
  });
});

describe("파일", () => {
  it("버킷별 형식·크기를 미리 검사한다", () => {
    expect(checkFile("bulletins", { name: "주보.PDF", size: 1000 })).toBeNull();
    expect(checkFile("images", { name: "a.pdf", size: 1000 })).toMatch(/형식/);
    expect(checkFile("attachments", { name: "신청서.hwp", size: 1000 })).toBeNull();
    expect(checkFile("bulletins", { name: "큰.pdf", size: 21 * 1024 * 1024 })).toMatch(/20MB/);
  });

  it("저장 위치 형식", () => {
    expect(isStoragePath(PATH)).toBe(true);
    expect(isStoragePath("posts/0b0e8a9e-3a8f-4c55-9d7a-0d2a5f6c1e11/0b0e8a9e-3a8f-4c55-9d7a-0d2a5f6c1e12.jpg")).toBe(true);
    expect(isStoragePath("bulletins/../x.pdf")).toBe(false);
  });
});

it("버튼에 따른 다음 상태", () => {
  expect(statusAfter("save", "published")).toBe("published");
  expect(statusAfter("save", null)).toBe("draft");
  expect(statusAfter("unpublish", "published")).toBe("unpublished");
});
