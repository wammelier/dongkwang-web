// 설교 관리자 화면과 Server Action이 함께 쓰는 규칙
import { z } from "zod";
import type { Status } from "./types";
import { DATE, fieldErrorsOf, HTTP_URL } from "./validation";

export type SermonRow = {
  id: string;
  title: string;
  scripture: string;
  preacher: string;
  preached_on: string;
  video_url: string | null;
  summary: string;
  status: Status;
  published_at: string | null;
  updated_at: string;
};

export type SermonDraft = { title: string; scripture: string; preacher: string; preachedOn: string; videoUrl: string; summary: string };

export const rowToSermonDraft = (r: SermonRow): SermonDraft => ({
  title: r.title,
  scripture: r.scripture,
  preacher: r.preacher,
  preachedOn: r.preached_on,
  videoUrl: r.video_url ?? "",
  summary: r.summary,
});

const TITLES = ["목사", "전도사", "강도사", "장로", "선교사", "교수", "사모", "권사", "집사", "님"];

/** "홍길동" → "홍길동 목사", 직함을 직접 쓴 경우("김철수 선교사")는 그대로 */
export const preacherLabel = (name: string) => (!name || TITLES.some((t) => name.trim().endsWith(t)) ? name : `${name} 목사`);

const schema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(120, "제목은 120자 이내로 입력해 주세요."),
  scripture: z.string().trim().max(80, "본문은 80자 이내로 입력해 주세요."),
  preacher: z.string().trim().max(40, "설교자는 40자 이내로 입력해 주세요."),
  preachedOn: z.string().regex(DATE, "설교 날짜를 입력해 주세요."),
  videoUrl: z.string().trim().refine((v) => v === "" || HTTP_URL.test(v), "http:// 또는 https://로 시작하는 주소를 입력해 주세요."),
  summary: z.string().trim().max(2000, "요약은 2,000자 이내로 입력해 주세요."),
});

export function parseSermonDraft(input: unknown, publishing: boolean) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;
  if (publishing && !d.preacher) return { ok: false as const, fieldErrors: { preacher: "게시하려면 설교자를 입력해 주세요." } };
  return {
    ok: true as const,
    values: { title: d.title, scripture: d.scripture, preacher: d.preacher, preached_on: d.preachedOn, video_url: d.videoUrl || null, summary: d.summary },
  };
}
