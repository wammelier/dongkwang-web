"use client";

import { useId, useRef, useState } from "react";
import { BUCKET_RULES, checkFile, contentTypeOf, extOf, type Bucket } from "@/lib/files";
import { createClient } from "@/lib/supabase/browser";

export type UploadedFile = { path: string; name: string; size: number };

/**
 * 브라우저에서 Supabase 저장소로 바로 올린다 (서버를 거치면 큰 PDF가 크기 제한에 걸림).
 * 권한은 저장소 RLS(활성 관리자만)와 버킷 설정(형식·크기)이 다시 확인한다.
 */
export function FileUpload({
  bucket,
  folder,
  label,
  multiple,
  disabled,
  onUploaded,
}: {
  bucket: Bucket;
  folder: string;
  label: string;
  multiple?: boolean;
  disabled?: boolean;
  onUploaded: (files: UploadedFile[]) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rule = BUCKET_RULES[bucket];

  const upload = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const problem = files.map((f) => checkFile(bucket, f) && `${f.name}: ${checkFile(bucket, f)}`).find(Boolean);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const done: UploadedFile[] = [];
    for (const file of files) {
      const path = `${folder}/${crypto.randomUUID()}.${extOf(file.name)}`;
      const { error: err } = await supabase.storage.from(bucket).upload(path, file, { contentType: contentTypeOf(file.name), upsert: false });
      if (err) {
        console.error("[upload]", err.message);
        setError(`${file.name}을(를) 올리지 못했습니다. 로그인이 풀렸다면 다시 로그인해 주세요.`);
        break;
      }
      done.push({ path, name: file.name, size: file.size });
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    if (done.length) onUploaded(done);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        aria-disabled={disabled || busy}
        className={`inline-flex h-11 w-fit items-center gap-2 rounded-card border-[1.5px] border-dashed px-4 text-[15px] font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
          disabled || busy ? "cursor-not-allowed border-line text-ink-muted" : "cursor-pointer border-primary text-primary hover:bg-primary-soft"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
        </svg>
        {busy ? "올리는 중…" : label}
        <input
          ref={input}
          id={id}
          type="file"
          multiple={multiple}
          disabled={disabled || busy}
          accept={rule.exts.map((e) => `.${e}`).join(",")}
          onChange={(e) => upload(e.target.files)}
          className="sr-only"
        />
      </label>
      {error ? <p role="alert" className="m-0 text-sm text-[var(--danger)]">{error}</p> : <p className="m-0 text-sm text-ink-muted">{rule.label}</p>}
    </div>
  );
}
