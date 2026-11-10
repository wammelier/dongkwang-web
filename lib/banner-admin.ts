// 절기 배너 관리자 화면과 Server Action이 함께 쓰는 입력 규칙
import { z } from "zod";
import { fromSeoulInput, toSeoulInput } from "./posts";
import type { BannerRow } from "./main-banner";
import { fieldErrorsOf, HTTP_URL } from "./validation";

export const BANNER_COLUMNS = "id, season, kind, title, eyebrow, description, primary_label, primary_href, publish_start, publish_end, sort, status";

const titleText = z.string().trim().min(1, "헤드라인을 입력해 주세요.").max(60, "헤드라인은 60자 이내로 입력해 주세요.");
const descText = z.string().trim().max(120, "설명은 120자 이내로 입력해 주세요.");

/** 헤드라인은 두 줄까지 (배너 디자인 기준) */
const twoLines = (v: string) => v.split("\n").length <= 2;

export const seasonTextSchema = z.object({
  title: titleText.refine(twoLines, "헤드라인은 두 줄까지 쓸 수 있습니다."),
  description: descText,
});

export type SpecialDraft = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  publishStart: string;
  publishEnd: string;
};

export const emptySpecial = (): SpecialDraft => ({ eyebrow: "", title: "", description: "", primaryLabel: "", primaryHref: "", publishStart: "", publishEnd: "" });

export const rowToSpecialDraft = (r: BannerRow): SpecialDraft => ({
  eyebrow: r.eyebrow ?? "",
  title: r.title,
  description: r.description,
  primaryLabel: r.primary_label ?? "",
  primaryHref: r.primary_href ?? "",
  publishStart: toSeoulInput(r.publish_start),
  publishEnd: toSeoulInput(r.publish_end),
});

const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const specialSchema = z.object({
  eyebrow: z.string().trim().max(30, "작은 제목은 30자 이내로 입력해 주세요."),
  title: titleText.refine(twoLines, "헤드라인은 두 줄까지 쓸 수 있습니다."),
  description: descText,
  primaryLabel: z.string().trim().max(12, "버튼 글자는 12자 이내로 입력해 주세요."),
  primaryHref: z
    .string()
    .trim()
    .refine((v) => v === "" || HTTP_URL.test(v) || /^\/[\w\-/?=&#%.]*$/.test(v), "https://… 또는 /news 처럼 사이트 안 주소를 입력해 주세요."),
  publishStart: z.string().refine((v) => v === "" || LOCAL.test(v), "날짜와 시각을 모두 입력해 주세요."),
  publishEnd: z.string().regex(LOCAL, "특별 배너는 끝나는 날짜와 시각이 꼭 필요합니다."),
});

export function parseSpecialDraft(input: unknown, publishing: boolean, now = new Date()) {
  const parsed = specialSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;
  const values = {
    kind: "special" as const,
    season: "special" as const,
    eyebrow: d.eyebrow || null,
    title: d.title,
    description: d.description,
    primary_label: d.primaryLabel || null,
    primary_href: d.primaryHref || null,
    publish_start: fromSeoulInput(d.publishStart),
    publish_end: fromSeoulInput(d.publishEnd)!,
  };
  const fieldErrors: Record<string, string> = {};
  if (Boolean(values.primary_label) !== Boolean(values.primary_href)) {
    fieldErrors[values.primary_label ? "primaryHref" : "primaryLabel"] = "버튼 글자와 주소를 함께 입력해 주세요.";
  }
  if (values.publish_start && values.publish_end <= values.publish_start) fieldErrors.publishEnd = "끝나는 시각은 시작보다 뒤여야 합니다.";
  if (publishing && new Date(values.publish_end) <= now) fieldErrors.publishEnd = "끝나는 시각이 이미 지났습니다.";
  return Object.keys(fieldErrors).length ? { ok: false as const, fieldErrors } : { ok: true as const, values };
}
