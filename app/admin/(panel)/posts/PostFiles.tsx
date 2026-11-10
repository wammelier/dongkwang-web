"use client";

import { useState, useTransition } from "react";
import { ResultMessage, type ActionResult } from "@/components/admin/fields";
import { FileUpload, type UploadedFile } from "@/components/admin/FileUpload";
import { addPostFiles, removePostFile, setPhotoConsent, type PostFile } from "@/lib/actions/post-files";
import { formatSize, publicFileUrl } from "@/lib/files";

/** 글의 사진·첨부파일. 올리거나 빼면 바로 저장된다(본문 저장과 별개) */
export function PostFiles({ postId, files, onChange, disabled }: { postId: string | null; files: PostFile[]; onChange: (files: PostFile[]) => void; disabled: boolean }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (!postId) {
    return (
      <section className="rounded-card border border-dashed border-line bg-white px-5 py-6 text-[15px] text-ink-muted">
        <h2 className="m-0 mb-1 text-[15px] font-bold text-ink">사진·첨부파일</h2>
        먼저 <b>임시 저장</b>하면 사진과 파일을 올릴 수 있습니다.
      </section>
    );
  }

  const attach = (kind: PostFile["kind"]) => (uploaded: UploadedFile[]) =>
    startTransition(async () => {
      const res = await addPostFiles(postId, kind, uploaded);
      setResult(res);
      if (res.ok && res.files) onChange([...files, ...res.files]);
    });

  const consent = (file: PostFile, value: boolean) =>
    startTransition(async () => {
      const res = await setPhotoConsent(file.id, value);
      setResult(res);
      if (res.ok) onChange(files.map((f) => (f.id === file.id ? { ...f, has_consent: value } : f)));
    });

  const remove = (file: PostFile) => {
    if (!window.confirm(`'${file.name}'을(를) 뺄까요? 바로 지워지고 되돌릴 수 없습니다.`)) return;
    startTransition(async () => {
      const res = await removePostFile(file.id);
      setResult(res);
      if (res.ok) onChange(files.filter((f) => f.id !== file.id));
    });
  };

  const images = files.filter((f) => f.kind === "image");
  const attachments = files.filter((f) => f.kind === "attachment");

  return (
    <section aria-labelledby="files-title" className="flex flex-col gap-5 rounded-card border border-line bg-white p-5 sm:p-6">
      <div>
        <h2 id="files-title" className="m-0 text-[15px] font-bold">사진·첨부파일</h2>
        <p className="m-0 mt-0.5 text-sm text-ink-muted">올리거나 빼면 바로 저장됩니다.</p>
      </div>
      <ResultMessage result={result} />

      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-[15px] font-bold">사진 <span className="font-normal text-ink-muted">{images.length}</span></h3>
        <p className="m-0 -mt-2 text-sm text-ink-muted">사람이 나온 사진은 공개 동의를 받은 뒤 체크하세요. 체크한 사진만 홈페이지에 보입니다.</p>
        {images.length > 0 && (
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
            {images.map((f) => (
              <li key={f.id} className="flex flex-col overflow-hidden rounded-card border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- 저장소 원본 미리보기 */}
                <img src={publicFileUrl("images", f.path)} alt={f.name} className="aspect-[4/3] w-full bg-[#fafaf8] object-cover" />
                <div className="flex flex-col gap-1.5 p-2.5">
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input type="checkbox" checked={f.has_consent} disabled={disabled || pending} onChange={(e) => consent(f, e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--primary)]" />
                    <span>{f.has_consent ? "공개 동의 확인" : <span className="text-[#9a4d00]">동의 확인 전 · 숨김</span>}</span>
                  </label>
                  <button type="button" disabled={disabled || pending} onClick={() => remove(f)} className="h-8 self-start text-sm text-ink-muted hover:text-[var(--danger)]">빼기</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <FileUpload bucket="images" folder={`posts/${postId}`} label="사진 올리기" multiple disabled={disabled || pending} onUploaded={attach("image")} />
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <h3 className="m-0 text-[15px] font-bold">첨부파일 <span className="font-normal text-ink-muted">{attachments.length}</span></h3>
        {attachments.length > 0 && (
          <ul className="m-0 list-none divide-y divide-line rounded-card border border-line p-0">
            {attachments.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                <a href={publicFileUrl("attachments", f.path)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[15px]">{f.name}</a>
                <span className="flex-none text-sm text-ink-muted">{formatSize(f.size)}</span>
                <button type="button" disabled={disabled || pending} onClick={() => remove(f)} className="h-9 flex-none text-sm text-ink-muted hover:text-[var(--danger)]">빼기</button>
              </li>
            ))}
          </ul>
        )}
        <FileUpload bucket="attachments" folder={`posts/${postId}`} label="파일 붙이기" multiple disabled={disabled || pending} onUploaded={attach("attachment")} />
      </div>
    </section>
  );
}
