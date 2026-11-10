import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { upcomingSunday } from "@/lib/bulletins";
import { SermonEditor } from "../SermonEditor";

export const metadata: Metadata = { title: "설교 등록" };

export default async function NewSermonPage() {
  await requireStaff();
  // 보통 지난 주일 설교를 올리므로 기본값은 오늘 기준 가장 가까운 지난(또는 오늘) 주일
  const next = new Date(`${upcomingSunday()}T00:00:00Z`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  if (next.toISOString().slice(0, 10) !== today) next.setUTCDate(next.getUTCDate() - 7);
  return (
    <div className="flex max-w-[1080px] flex-col gap-4">
      <h1 className="m-0 text-[26px] font-bold">설교 등록</h1>
      <SermonEditor
        id={null}
        initial={{ title: "", scripture: "", preacher: "", preachedOn: next.toISOString().slice(0, 10), videoUrl: "", summary: "" }}
        meta={null}
      />
    </div>
  );
}
