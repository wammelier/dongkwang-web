// 공지·행사·이야기 관리자 화면과 Server Action이 함께 쓰는 규칙 (계획서 6.2)
// 시각 입력은 <input type="datetime-local">의 "YYYY-MM-DDTHH:mm"을 한국 시간으로 본다.
import { z } from "zod";
import type { PostType, Status } from "./types";

export const POST_TYPE_LABEL: Record<PostType, string> = { notice: "공지", event: "행사", story: "교회 이야기" };
export const POST_TYPES = Object.keys(POST_TYPE_LABEL) as PostType[];

/** 관리자 목록·편집 화면이 다루는 posts 행 (snake_case 그대로) */
export type PostRow = {
  id: string;
  type: PostType;
  title: string;
  summary: string;
  body: string;
  status: Status;
  is_pinned: boolean;
  publish_start: string | null;
  publish_end: string | null;
  event_start: string | null;
  event_end: string | null;
  event_place: string | null;
  event_target: string | null;
  apply_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** 편집 화면의 입력값 (모두 문자열, 빈 값은 "") */
export type PostDraft = {
  type: PostType;
  title: string;
  summary: string;
  body: string;
  isPinned: boolean;
  publishStart: string;
  publishEnd: string;
  eventStart: string;
  eventEnd: string;
  eventPlace: string;
  eventTarget: string;
  applyUrl: string;
};

export const emptyDraft = (type: PostType = "notice"): PostDraft => ({
  type,
  title: "",
  summary: "",
  body: "",
  isPinned: false,
  publishStart: "",
  publishEnd: "",
  eventStart: "",
  eventEnd: "",
  eventPlace: "",
  eventTarget: "",
  applyUrl: "",
});

export const rowToDraft = (r: PostRow): PostDraft => ({
  type: r.type,
  title: r.title,
  summary: r.summary,
  body: r.body,
  isPinned: r.is_pinned,
  publishStart: toSeoulInput(r.publish_start),
  publishEnd: toSeoulInput(r.publish_end),
  eventStart: toSeoulInput(r.event_start),
  eventEnd: toSeoulInput(r.event_end),
  eventPlace: r.event_place ?? "",
  eventTarget: r.event_target ?? "",
  applyUrl: r.apply_url ?? "",
});

const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** "2026-11-08T14:00"(한국 시간) → ISO. 한국은 서머타임이 없어 +09:00 고정 */
export function fromSeoulInput(value: string): string | null {
  if (!value) return null;
  if (!LOCAL.test(value)) throw new Error(`잘못된 시각: ${value}`);
  return new Date(`${value}:00+09:00`).toISOString();
}

/** ISO → "2026-11-08T14:00"(한국 시간) */
export function toSeoulInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => p.find((x) => x.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** 버튼마다 하는 일: 임시 저장 / 게시 / 상태 그대로 저장 / 게시 중단 */
export const SAVE_INTENTS = ["draft", "publish", "save", "unpublish"] as const;
export type SaveIntent = (typeof SAVE_INTENTS)[number];

/** 버튼을 누른 뒤의 상태 ("save"는 지금 상태 그대로, 새 항목이면 임시 저장) */
export function statusAfter(intent: SaveIntent, current: Status | null): Status {
  if (intent === "publish") return "published";
  if (intent === "unpublish") return "unpublished";
  if (intent === "draft") return "draft";
  return current ?? "draft";
}

const time = z.string().refine((v) => v === "" || LOCAL.test(v), "날짜와 시각을 모두 입력해 주세요.");

const draftSchema = z.object({
  type: z.enum(["notice", "event", "story"], { message: "종류를 선택해 주세요." }),
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(120, "제목은 120자 이내로 입력해 주세요."),
  summary: z.string().trim().max(200, "요약은 200자 이내로 입력해 주세요."),
  body: z.string().max(20000, "본문은 20,000자 이내로 입력해 주세요."),
  isPinned: z.boolean(),
  publishStart: time,
  publishEnd: time,
  eventStart: time,
  eventEnd: time,
  eventPlace: z.string().trim().max(100, "장소는 100자 이내로 입력해 주세요."),
  eventTarget: z.string().trim().max(100, "대상은 100자 이내로 입력해 주세요."),
  applyUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "http:// 또는 https://로 시작하는 주소를 입력해 주세요."),
});

export type PostValues = {
  type: PostType;
  title: string;
  summary: string;
  body: string;
  is_pinned: boolean;
  publish_start: string | null;
  publish_end: string | null;
  event_start: string | null;
  event_end: string | null;
  event_place: string | null;
  event_target: string | null;
  apply_url: string | null;
};

export type ParseResult = { ok: true; values: PostValues } | { ok: false; fieldErrors: Record<string, string> };

/**
 * 입력 검사 + DB 값으로 변환. 게시할 때만 행사 일시를 필수로 하고, 노출 종료가 이미 지났는지 본다.
 * 행사가 아닌 글의 행사 항목은 버린다(DB 제약 posts_event_only).
 */
export function parsePostDraft(input: unknown, publishing: boolean, now = new Date()): ParseResult {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, fieldErrors };
  }
  const d = parsed.data;
  const isEvent = d.type === "event";
  const values: PostValues = {
    type: d.type,
    title: d.title,
    summary: d.summary,
    body: d.body,
    is_pinned: d.isPinned,
    publish_start: fromSeoulInput(d.publishStart),
    publish_end: fromSeoulInput(d.publishEnd),
    event_start: isEvent ? fromSeoulInput(d.eventStart) : null,
    event_end: isEvent ? fromSeoulInput(d.eventEnd) : null,
    event_place: isEvent ? d.eventPlace || null : null,
    event_target: isEvent ? d.eventTarget || null : null,
    apply_url: isEvent ? d.applyUrl || null : null,
  };

  const fieldErrors: Record<string, string> = {};
  if (values.publish_start && values.publish_end && values.publish_end <= values.publish_start) {
    fieldErrors.publishEnd = "노출 종료는 시작보다 뒤여야 합니다.";
  }
  if (values.event_start && values.event_end && values.event_end < values.event_start) {
    fieldErrors.eventEnd = "행사 종료는 시작과 같거나 뒤여야 합니다.";
  }
  if (publishing && isEvent && !values.event_start) {
    fieldErrors.eventStart = "행사를 게시하려면 행사 일시를 입력해 주세요.";
  }
  if (publishing && values.publish_end && new Date(values.publish_end) <= now) {
    fieldErrors.publishEnd = "노출 종료가 이미 지났습니다. 날짜를 바꾸거나 비워 주세요.";
  }
  return Object.keys(fieldErrors).length ? { ok: false, fieldErrors } : { ok: true, values };
}

/** 목록·편집 화면의 상태 표시. 게시 상태라도 노출 기간에 따라 '게시 예정'·'기간 종료'로 나눈다 */
export type DisplayState = "draft" | "scheduled" | "live" | "expired" | "unpublished" | "trashed";

export const DISPLAY_LABEL: Record<DisplayState, string> = {
  draft: "임시 저장",
  scheduled: "게시 예정",
  live: "게시 중",
  expired: "기간 종료",
  unpublished: "게시 중단",
  trashed: "휴지통",
};

export function displayState(
  r: Pick<PostRow, "status" | "publish_start" | "publish_end">,
  now = new Date(),
): DisplayState {
  if (r.status !== "published") return r.status;
  if (r.publish_start && new Date(r.publish_start) > now) return "scheduled";
  if (r.publish_end && new Date(r.publish_end) < now) return "expired";
  return "live";
}

/** 저장 후 안내 문구 */
export function savedMessage(state: DisplayState) {
  if (state === "live") return "게시했습니다. 홈페이지에 바로 보입니다.";
  if (state === "scheduled") return "저장했습니다. 노출 시작 시각부터 홈페이지에 보입니다.";
  return `저장했습니다. (${DISPLAY_LABEL[state]})`;
}

/** 목록 필터. "all"은 휴지통을 뺀 전부 */
export const STATUS_FILTERS = ["all", "draft", "published", "unpublished", "trashed"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  all: "전체",
  draft: "임시 저장",
  published: "게시",
  unpublished: "게시 중단",
  trashed: "휴지통",
};

/** ilike 검색어의 와일드카드 문자를 그대로 찾도록 이스케이프 */
export const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);
