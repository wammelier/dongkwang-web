import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { BANNER_COLUMNS, emptySpecial } from "@/lib/banner-admin";
import type { BannerRow } from "@/lib/main-banner";
import { createClient } from "@/lib/supabase/server";
import { SpecialEditor } from "../../SpecialEditor";

export const metadata: Metadata = { title: "특별 배너 만들기" };

export default async function NewSpecialPage() {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.from("main_banners").select(BANNER_COLUMNS).eq("status", "published");
  const published = (data ?? []) as BannerRow[];
  return (
    <div className="flex max-w-[1080px] flex-col gap-4">
      <h1 className="m-0 text-[26px] font-bold">특별 배너 만들기</h1>
      <SpecialEditor id={null} initial={emptySpecial()} meta={null} others={published.filter((r) => r.kind === "special")} seasons={published.filter((r) => r.kind === "season")} />
    </div>
  );
}
