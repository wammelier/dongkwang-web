// 주보 관리자 화면과 Server Action이 함께 쓰는 규칙
import { z } from "zod";
import { isStoragePath } from "./files";
import type { Status } from "./types";
import { DATE, fieldErrorsOf } from "./validation";

export type BulletinRow = {
  id: string;
  date: string;
  title: string;
  file_path: string | null;
  note: string;
  status: Status;
  published_at: string | null;
  updated_at: string;
};

export type BulletinDraft = { date: string; title: string; note: string; filePath: string };

export const rowToBulletinDraft = (r: BulletinRow): BulletinDraft => ({
  date: r.date,
  title: r.title,
  note: r.note,
  filePath: r.file_path ?? "",
});

/** 한국 날짜 기준 이번(오늘 포함) 또는 다음 주일 "YYYY-MM-DD" */
export function upcomingSunday(now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7));
  return d.toISOString().slice(0, 10);
}

const ORDINAL = ["첫째", "둘째", "셋째", "넷째", "다섯째"];

/** "2026-11-08" → "11월 둘째 주 주보" (그 달의 몇 번째 주일인지) */
export function suggestBulletinTitle(date: string) {
  if (!DATE.test(date)) return "";
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${ORDINAL[Math.ceil(d / 7) - 1]} 주 주보`;
}

const schema = z.object({
  date: z.string().regex(DATE, "날짜를 입력해 주세요."),
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(80, "제목은 80자 이내로 입력해 주세요."),
  note: z.string().trim().max(300, "설명은 300자 이내로 입력해 주세요."),
  filePath: z.string().refine((v) => v === "" || isStoragePath(v), "파일을 다시 올려 주세요."),
});

export type BulletinValues = { date: string; title: string; note: string; file_path: string | null };

export function parseBulletinDraft(input: unknown, publishing: boolean) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;
  if (publishing && !d.filePath) return { ok: false as const, fieldErrors: { filePath: "주보를 게시하려면 PDF나 사진 파일을 올려 주세요." } };
  return { ok: true as const, values: { date: d.date, title: d.title, note: d.note, file_path: d.filePath || null } satisfies BulletinValues };
}
