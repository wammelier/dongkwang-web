import { describe, expect, it } from "vitest";
import { eventRange } from "@/lib/date";
import { displayState, emptyDraft, escapeLike, fromSeoulInput, parsePostDraft, rowToDraft, toSeoulInput, type PostRow } from "@/lib/posts";

const now = new Date("2026-11-04T03:00:00Z"); // 한국 시간 11월 4일 정오

describe("한국 시간 입력 변환", () => {
  it("datetime-local 값을 한국 시간으로 보고 ISO로 바꾼다", () => {
    expect(fromSeoulInput("2026-11-08T14:00")).toBe("2026-11-08T05:00:00.000Z");
    expect(fromSeoulInput("")).toBeNull();
  });

  it("ISO를 한국 시간 입력값으로 되돌린다 (자정 넘김 포함)", () => {
    expect(toSeoulInput("2026-11-08T05:00:00Z")).toBe("2026-11-08T14:00");
    expect(toSeoulInput("2026-12-31T15:30:00Z")).toBe("2027-01-01T00:30");
    expect(toSeoulInput(null)).toBe("");
  });

  it("형식이 틀린 값은 받지 않는다", () => {
    expect(() => fromSeoulInput("2026-11-08")).toThrow();
  });
});

describe("입력 검사", () => {
  const base = { ...emptyDraft("notice"), title: "추수감사 주일 안내" };

  it("제목은 필수", () => {
    const r = parsePostDraft({ ...base, title: "   " }, false, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.title).toMatch(/제목/);
  });

  it("행사가 아닌 글의 행사 항목은 버린다", () => {
    const r = parsePostDraft({ ...base, eventStart: "2026-11-08T14:00", eventPlace: "본당", applyUrl: "https://x.kr" }, true, now);
    expect(r.ok && r.values).toMatchObject({ event_start: null, event_place: null, apply_url: null });
  });

  it("행사는 게시할 때만 일시가 필수", () => {
    const event = { ...base, type: "event" as const };
    expect(parsePostDraft(event, false, now).ok).toBe(true);
    const r = parsePostDraft(event, true, now);
    expect(!r.ok && r.fieldErrors.eventStart).toBeTruthy();
  });

  it("노출 종료는 시작보다 뒤, 게시할 때는 아직 안 지난 시각이어야 한다", () => {
    const backwards = parsePostDraft({ ...base, publishStart: "2026-11-10T00:00", publishEnd: "2026-11-09T00:00" }, false, now);
    expect(!backwards.ok && backwards.fieldErrors.publishEnd).toMatch(/뒤/);
    const past = parsePostDraft({ ...base, publishEnd: "2026-11-01T00:00" }, true, now);
    expect(!past.ok && past.fieldErrors.publishEnd).toMatch(/지났/);
    expect(parsePostDraft({ ...base, publishEnd: "2026-11-01T00:00" }, false, now).ok).toBe(true);
  });

  it("신청 링크는 http(s) 주소만", () => {
    const r = parsePostDraft({ ...base, type: "event", applyUrl: "javascript:alert(1)" }, false, now);
    expect(!r.ok && r.fieldErrors.applyUrl).toBeTruthy();
  });

  it("편집 화면 값 → DB 값 → 편집 화면 값이 그대로 돌아온다", () => {
    const draft = {
      ...base,
      type: "event" as const,
      isPinned: true,
      eventStart: "2026-11-21T10:00",
      eventEnd: "2026-11-21T16:00",
      eventPlace: "교육관",
      publishEnd: "2026-11-22T00:00",
    };
    const r = parsePostDraft(draft, true, now);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const row = { ...r.values, id: "x", status: "published", published_at: null, created_at: "", updated_at: "" } as PostRow;
    expect(rowToDraft(row)).toEqual(draft);
  });
});

describe("상태 표시", () => {
  const row = (status: PostRow["status"], publish_start: string | null = null, publish_end: string | null = null) => ({ status, publish_start, publish_end });

  it("게시 상태는 노출 기간에 따라 게시 예정·게시 중·기간 종료로 나뉜다", () => {
    expect(displayState(row("published"), now)).toBe("live");
    expect(displayState(row("published", "2026-11-05T00:00:00Z"), now)).toBe("scheduled");
    expect(displayState(row("published", null, "2026-11-01T00:00:00Z"), now)).toBe("expired");
    expect(displayState(row("draft", null, "2026-11-01T00:00:00Z"), now)).toBe("draft");
  });
});

it("검색어의 %와 _는 글자 그대로 찾는다", () => {
  expect(escapeLike("50%_할인\\")).toBe("50\\%\\_할인\\\\");
});

describe("행사 일시 표시", () => {
  it("같은 날이면 종료 시각만, 다른 날이면 날짜까지", () => {
    expect(eventRange("2026-11-21T01:00:00Z", "2026-11-21T07:00:00Z")).toBe("11월 21일 (토요일) 오전 10:00 ~ 오후 4:00");
    expect(eventRange("2026-11-21T01:00:00Z", "2026-11-22T03:00:00Z")).toBe("11월 21일 (토요일) 오전 10:00 ~ 11월 22일 (주일) 오후 12:00");
    expect(eventRange("2026-11-21T01:00:00Z")).toBe("11월 21일 (토요일) 오전 10:00");
  });
});
