import "server-only";
import { createClient } from "./supabase/server";

/** 저장소 파일 삭제. 실패해도 화면 작업은 성공으로 두고 로그만 남긴다(남은 파일은 공개 목록에 나오지 않음) */
export async function removeFiles(files: { bucket: string; path: string }[]) {
  if (files.length === 0) return;
  const supabase = await createClient();
  const byBucket = new Map<string, string[]>();
  for (const f of files) byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f.path]);
  for (const [bucket, paths] of byBucket) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) console.error(`[storage] ${bucket} 파일 삭제 실패:`, error.message);
  }
}
