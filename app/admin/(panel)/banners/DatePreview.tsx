"use client";

import { useState } from "react";
import { BannerView } from "@/components/BannerView";
import { resolveBanner, type BannerRow } from "@/lib/main-banner";

/** 날짜별 미리보기: 공개 화면과 같은 규칙으로 고르되 아무것도 바꾸지 않는다 (기획서 15.5) */
export function DatePreview({ rows, today }: { rows: BannerRow[]; today: string }) {
  const [date, setDate] = useState(today);
  const [mobile, setMobile] = useState(false);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= "1900-01-01" && date <= "2199-12-31";
  // 그날 정오(한국 시간) 기준
  const banner = valid ? resolveBanner(rows, new Date(`${date}T12:00:00+09:00`)) : null;

  return (
    <section aria-labelledby="by-date" className="flex flex-col gap-4">
      <div>
        <h2 id="by-date" className="m-0 text-lg font-bold">날짜로 미리보기</h2>
        <p className="m-0 mt-1 text-[15px] text-ink-muted">다른 날짜에 메인에 어떤 배너가 보일지 확인합니다. 게시된 배너만 반영됩니다.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="preview-date" className="text-[15px] font-bold">날짜</label>
          <input
            id="preview-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 rounded-card border border-line bg-white px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
          />
        </div>
        <div role="radiogroup" aria-label="화면 크기" className="flex rounded-card border border-line bg-white p-1">
          {[
            { v: false, label: "PC" },
            { v: true, label: "휴대폰" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={mobile === o.v}
              onClick={() => setMobile(o.v)}
              className={`h-10 rounded-[6px] px-4 text-[15px] font-bold ${mobile === o.v ? "bg-primary text-on-primary" : "text-ink-muted hover:text-ink"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {date !== today && (
          <button type="button" onClick={() => setDate(today)} className="h-12 text-sm text-ink-muted hover:text-primary">
            오늘로
          </button>
        )}
      </div>
      {banner ? (
        <>
          <p className="m-0 text-[15px]" aria-live="polite">
            <b>{banner.source === "special" ? "특별 배너" : banner.seasonName}</b> · <span className="text-ink-muted">{banner.reason}</span>
          </p>
          <div className={`overflow-hidden rounded-card border border-line ${mobile ? "mx-auto w-full max-w-[375px]" : ""}`}>
            <BannerView banner={banner} mobile={mobile} preview />
          </div>
        </>
      ) : (
        <p role="alert" className="m-0 text-sm text-[var(--danger)]">1900년부터 2199년 사이의 날짜를 골라 주세요.</p>
      )}
    </section>
  );
}
