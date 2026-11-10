import { DISPLAY_LABEL, type DisplayState } from "@/lib/posts";

// 색만으로 구분하지 않도록 항상 글자와 함께 쓴다 (디자인 시스템 12장)
const TONE: Record<DisplayState, string> = {
  live: "bg-primary-soft text-primary",
  scheduled: "bg-[#eaf3dc] text-[#3f6212]",
  draft: "bg-accent-soft text-ink",
  expired: "bg-[#f1f1ee] text-ink-muted",
  unpublished: "bg-[#fdf1e3] text-[#9a4d00]",
  trashed: "bg-[#fbeceb] text-[var(--danger)]",
};

export function PostStatusBadge({ state }: { state: DisplayState }) {
  return (
    <span className={`inline-flex flex-none rounded px-2 py-0.5 text-xs font-bold whitespace-nowrap ${TONE[state]}`}>
      {DISPLAY_LABEL[state]}
    </span>
  );
}
