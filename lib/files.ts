// 저장소 파일 규칙: 버킷별 허용 형식·크기 (supabase/migrations의 버킷 설정과 같게 유지)
import { SUPABASE_URL } from "./supabase/env";

export type Bucket = "bulletins" | "images" | "attachments";

const MB = 1024 * 1024;

/** 확장자 → 저장할 형식 이름. 한글 문서는 브라우저가 형식을 비워 보내는 경우가 많아 확장자로 정한다 */
const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  hwp: "application/x-hwp",
  hwpx: "application/hwp+zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export const BUCKET_RULES: Record<Bucket, { exts: string[]; maxBytes: number; label: string }> = {
  bulletins: { exts: ["pdf", "jpg", "jpeg", "png", "webp"], maxBytes: 20 * MB, label: "PDF·JPG·PNG·WEBP, 20MB 이하" },
  images: { exts: ["jpg", "jpeg", "png", "webp"], maxBytes: 10 * MB, label: "JPG·PNG·WEBP, 10MB 이하" },
  attachments: { exts: ["pdf", "hwp", "hwpx", "docx", "xlsx", "pptx", "jpg", "jpeg", "png", "webp"], maxBytes: 20 * MB, label: "PDF·한글·워드·엑셀·파워포인트·사진, 20MB 이하" },
};

export const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

/** 올리기 전 검사. 문제가 있으면 안내 문구, 없으면 null */
export function checkFile(bucket: Bucket, file: { name: string; size: number }): string | null {
  const rule = BUCKET_RULES[bucket];
  const ext = extOf(file.name);
  if (!rule.exts.includes(ext)) return `올릴 수 없는 형식입니다. (${rule.label})`;
  if (file.size > rule.maxBytes) return `파일이 너무 큽니다. ${Math.round(rule.maxBytes / MB)}MB 이하로 줄여 주세요.`;
  if (file.size === 0) return "빈 파일입니다.";
  return null;
}

export const contentTypeOf = (name: string) => TYPES[extOf(name)] ?? "application/octet-stream";

/** 공개 버킷 파일 주소 */
export const publicFileUrl = (bucket: Bucket, path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;

/** 저장 위치 검사: 우리가 만든 형식(<폴더>/<uuid>.<확장자>)만 받는다 */
export const isStoragePath = (path: string) => /^[a-z]+(\/[0-9a-f-]{36})?\/[0-9a-f-]{36}\.[a-z0-9]+$/.test(path);

export const formatSize = (bytes: number) =>
  bytes >= MB ? `${(bytes / MB).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
