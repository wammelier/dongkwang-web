"use server";

import { saveContent, type SaveResult } from "@/lib/content-save";
import type { SaveIntent } from "@/lib/posts";
import { parseSermonDraft } from "@/lib/sermons";

export async function saveSermon(id: string | null, draft: unknown, intent: SaveIntent): Promise<SaveResult> {
  return saveContent({ table: "sermons", label: "설교", id, intent, parse: (publishing) => parseSermonDraft(draft, publishing) });
}
