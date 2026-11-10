// 시험이 끝나면 [E2E] 글·주보와 올린 파일을 지운다.
// 시험 계정은 콘텐츠 담당자라 완전 삭제 권한이 없으므로 서버 키로 지운다 (이 파일은 시험용 PC에서만 실행).
import { createClient } from "@supabase/supabase-js";
import { MARK } from "./env";

export default async function cleanup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: posts } = await admin.from("posts").select("id").like("title", `${MARK}%`);
  const postIds = (posts ?? []).map((p) => p.id);
  if (postIds.length) {
    const { data: files } = await admin.from("post_files").select("kind, path").in("post_id", postIds);
    const images = (files ?? []).filter((f) => f.kind === "image").map((f) => f.path);
    const attachments = (files ?? []).filter((f) => f.kind === "attachment").map((f) => f.path);
    if (images.length) await admin.storage.from("images").remove(images);
    if (attachments.length) await admin.storage.from("attachments").remove(attachments);
    await admin.from("posts").delete().in("id", postIds);
  }

  // 촬영·시험으로 만든 설교와 배너
  await admin.from("sermons").delete().like("title", `${MARK}%`);
  await admin.from("main_banners").delete().like("title", `${MARK}%`);

  const { data: bulletins } = await admin.from("bulletins").select("id, file_path").like("title", `${MARK}%`);
  const paths = (bulletins ?? []).map((b) => b.file_path).filter((p): p is string => Boolean(p));
  if (paths.length) await admin.storage.from("bulletins").remove(paths);
  if (bulletins?.length) await admin.from("bulletins").delete().in("id", bulletins.map((b) => b.id));
}
