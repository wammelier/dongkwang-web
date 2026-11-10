import type { z } from "zod";

/** zod 오류 → { 칸이름: 첫 오류 문구 } */
export function fieldErrorsOf(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return fieldErrors;
}

export const HTTP_URL = /^https?:\/\/\S+$/;
export const DATE = /^\d{4}-\d{2}-\d{2}$/;
