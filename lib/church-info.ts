// 교회 정보 관리자 화면(최고 관리자)과 Server Action이 함께 쓰는 규칙
import { z } from "zod";
import { HTTP_URL } from "./validation";

export const CHURCH_TABS = ["basic", "visit", "about", "worship", "groups", "faq"] as const;
export type ChurchTab = (typeof CHURCH_TABS)[number];
export const CHURCH_TAB_LABEL: Record<ChurchTab, string> = {
  basic: "기본 정보",
  visit: "방문 안내",
  about: "교회 소개",
  worship: "예배 시간",
  groups: "공동체",
  faq: "자주 묻는 질문",
};

export const WEEKDAYS = ["주일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

// ───────── 목록 항목 공통
/** 목록 오류는 "<번호>.<칸>" 이름으로 돌려준다 (예: "2.name") */
export type ListErrors = Record<string, string>;

function listErrorsOf(error: z.ZodError): ListErrors {
  const out: ListErrors = {};
  for (const issue of error.issues) {
    const [first, second, third] = issue.path;
    // { items: [...] } 또는 { 목록이름: [...] } 안의 항목
    const key = typeof second === "number" ? `${String(first)}.${second}.${String(third)}` : String(first);
    out[key] ??= issue.message;
  }
  return out;
}

const text = (max: number, label: string) => z.string().trim().max(max, `${label}은(는) ${max}자 이내로 입력해 주세요.`);
const required = (max: number, label: string) => text(max, label).min(1, `${label}을(를) 입력해 주세요.`);
const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || HTTP_URL.test(v), "http:// 또는 https://로 시작하는 주소를 입력해 주세요.");

const titleBody = z.object({ title: required(40, "제목"), body: text(300, "내용") });

// ───────── church_info 탭별
const basic = z.object({
  name: required(40, "교회 이름"),
  name_en: text(60, "영문 이름"),
  denomination: text(60, "교단"),
  address: text(120, "주소"),
  phone: text(30, "전화번호"),
  office_hours: text(80, "사무실 시간"),
  map_url: optionalUrl,
  channels: z.array(z.object({ label: required(30, "이름"), href: optionalUrl })).max(10, "채널은 10개까지 넣을 수 있습니다."),
});

const visit = z.object({
  parking_headline: text(40, "주차 요약"),
  parking_detail: text(300, "주차 안내"),
  transit: text(500, "대중교통"),
  accessibility: text(300, "이동 편의"),
  welcome_steps: z.array(titleBody).max(6, "6단계까지 넣을 수 있습니다."),
  visit_steps: z.array(titleBody).max(8, "8단계까지 넣을 수 있습니다."),
});

const about = z.object({
  intro: text(1000, "교회 소개"),
  values: z.array(titleBody).max(6, "6개까지 넣을 수 있습니다."),
  pastor_name: text(30, "담임목사 이름"),
  pastor_greeting: text(3000, "인사말"),
  staff: z.array(z.object({ role: required(30, "직분"), name: required(30, "이름") })).max(30, "30명까지 넣을 수 있습니다."),
  history: z.array(z.object({ year: required(10, "연도"), text: required(200, "내용") })).max(50, "50개까지 넣을 수 있습니다."),
});

export const CHURCH_INFO_SCHEMAS = { basic, visit, about } as const;
export type ChurchInfoTab = keyof typeof CHURCH_INFO_SCHEMAS;
export type ChurchInfoValues = { [K in ChurchInfoTab]: z.infer<(typeof CHURCH_INFO_SCHEMAS)[K]> };

/** 화면 값 → church_info 칼럼 (빈 주소는 null) */
export function parseChurchInfo<T extends ChurchInfoTab>(tab: T, input: unknown) {
  const parsed = CHURCH_INFO_SCHEMAS[tab].safeParse(input);
  if (!parsed.success) return { ok: false as const, fieldErrors: listErrorsOf(parsed.error) };
  const v = parsed.data as Record<string, unknown>;
  if ("map_url" in v) v.map_url = v.map_url || null;
  if (Array.isArray(v.channels)) v.channels = (v.channels as { label: string; href: string }[]).map((c) => ({ label: c.label, href: c.href || null }));
  return { ok: true as const, values: v };
}

// ───────── 목록 표 (예배 시간·공동체·FAQ)
export const worshipItem = z.object({
  id: z.string().uuid().nullable(),
  name: required(40, "예배 이름"),
  target: text(40, "대상"),
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "시작 시각을 입력해 주세요."),
  place: text(40, "장소"),
  is_online: z.boolean(),
  is_main: z.boolean(),
  is_active: z.boolean(),
});

export const communityItem = z.object({
  id: z.string().uuid().nullable(),
  slug: z.string().nullable(),
  name: required(40, "모임 이름"),
  target: text(40, "대상"),
  age_range: text(30, "나이"),
  meet_time: text(40, "모임 시간"),
  place: text(40, "장소"),
  activities: text(300, "활동"),
  how_to_join: text(300, "참여 방법"),
  contact: text(60, "문의"),
  is_active: z.boolean(),
});

export const faqItem = z.object({
  id: z.string().uuid().nullable(),
  question: required(100, "질문"),
  answer: text(1000, "답변"),
  is_active: z.boolean(),
});

export const LIST_SCHEMAS = {
  worship: z
    .object({ items: z.array(worshipItem).max(20, "20개까지 넣을 수 있습니다.") })
    .refine((v) => v.items.filter((i) => i.is_main).length <= 1, { message: "대표 예배는 하나만 정할 수 있습니다.", path: ["items"] }),
  groups: z.object({ items: z.array(communityItem).max(20, "20개까지 넣을 수 있습니다.") }),
  faq: z.object({ items: z.array(faqItem).max(30, "30개까지 넣을 수 있습니다.") }),
} as const;
export type ListTab = keyof typeof LIST_SCHEMAS;

export type WorshipItem = z.infer<typeof worshipItem>;
export type CommunityItem = z.infer<typeof communityItem>;
export type FaqItem = z.infer<typeof faqItem>;

/** 목록 검사 → 저장용 (순서는 화면 순서대로 sort 1, 2, 3…) */
export function parseList(tab: ListTab, items: unknown) {
  const parsed = LIST_SCHEMAS[tab].safeParse({ items });
  if (!parsed.success) return { ok: false as const, fieldErrors: listErrorsOf(parsed.error) };
  return { ok: true as const, items: (parsed.data.items as Record<string, unknown>[]).map((item, i) => ({ ...item, sort: i + 1 })) };
}
