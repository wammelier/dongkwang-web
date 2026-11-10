import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { normalizeSections } from "@/lib/main-sections";
import { createClient } from "@/lib/supabase/server";
import { SectionsEditor } from "./SectionsEditor";

export const metadata: Metadata = { title: "메인 구역" };

export default async function MainSectionsPage() {
  const admin = await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.from("main_sections").select("key, is_visible, sort, headline, body");

  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <div>
        <h1 className="m-0 text-[26px] font-bold">메인 구역</h1>
        <p className="m-0 mt-1 text-ink-muted">
          메인 페이지에 보일 구역을 켜고 끄거나 순서를 바꿉니다. 저장하면 홈페이지에 바로 반영됩니다.
        </p>
      </div>
      {error ? (
        <p role="alert" className="m-0 rounded-card bg-[#fbeceb] px-4 py-3 text-[var(--danger)]">
          구역 설정을 불러오지 못했습니다. 새로고침해 주세요.
        </p>
      ) : (
        <SectionsEditor initial={normalizeSections(data ?? [])} canEdit={admin.role === "super_admin"} />
      )}
    </div>
  );
}
