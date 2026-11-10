import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AccountRow, InviteForm, type AccountRowData } from "./forms";

export const metadata: Metadata = { title: "관리자 계정" };

export default async function AccountsPage() {
  const me = await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, role, is_active, created_at")
    .order("created_at");
  const accounts = (data ?? []) as AccountRowData[];

  return (
    <div className="flex max-w-[960px] flex-col gap-8">
      <div>
        <h1 className="m-0 text-[26px] font-bold">관리자 계정</h1>
        <p className="m-0 mt-1 text-ink-muted">
          계정은 사람마다 따로 발급합니다. 담당자가 바뀌면 이전 계정을 비활성화해 주세요.
        </p>
      </div>

      <section aria-labelledby="invite" className="rounded-card border border-line bg-white p-6">
        <h2 id="invite" className="m-0 mb-4 text-lg font-bold">새 관리자 초대</h2>
        <InviteForm />
      </section>

      <section aria-labelledby="list" className="rounded-card border border-line bg-white">
        <h2 id="list" className="m-0 border-b border-line px-6 py-4 text-lg font-bold">
          계정 목록 <span className="text-[15px] font-normal text-ink-muted">{accounts.length}명</span>
        </h2>
        {error ? (
          <p role="alert" className="m-0 px-6 py-5 text-[var(--danger)]">계정 목록을 불러오지 못했습니다.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {accounts.map((a) => (
              <AccountRow key={a.id} account={a} isMe={a.id === me.id} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
