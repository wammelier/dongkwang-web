"use server";

import { parseBulletinDraft, type BulletinValues } from "@/lib/bulletins";
import { saveContent, type SaveResult } from "@/lib/content-save";
import type { SaveIntent } from "@/lib/posts";
import { removeFiles } from "@/lib/storage";

/** 주보 저장. 파일을 바꾸면 이전 파일은 저장소에서 지운다 */
export async function saveBulletin(id: string | null, draft: unknown, intent: SaveIntent): Promise<SaveResult> {
  return saveContent<BulletinValues>({
    table: "bulletins",
    label: "주보",
    id,
    intent,
    parse: (publishing) => parseBulletinDraft(draft, publishing),
    onUniqueViolation: { date: "이 날짜의 주보가 이미 있습니다. 목록에서 그 주보를 열어 고쳐 주세요." },
    beforeColumns: "file_path",
    afterSave: async (before, values) => {
      const old = before?.file_path as string | null | undefined;
      if (old && old !== values.file_path) await removeFiles([{ bucket: "bulletins", path: old }]);
    },
  });
}
