import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: { default: "관리자", template: "%s | 동광교회 관리자" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupGuide />;
  return <div className="min-h-screen bg-[#f6f7f4]">{children}</div>;
}

function SetupGuide() {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-5 py-20">
      <p className="m-0 text-sm font-medium text-label">관리자 페이지</p>
      <h1 className="m-0 text-[28px] font-bold">데이터베이스 연결이 필요합니다</h1>
      <p className="m-0 text-ink-muted">
        Supabase 프로젝트를 만들고 <code>.env.local</code>에 아래 값을 넣은 뒤 서버를 다시 시작해 주세요. 자세한 순서는{" "}
        <code>supabase/README.md</code>에 있습니다.
      </p>
      <pre className="overflow-x-auto rounded-card bg-ink p-4 text-sm leading-relaxed text-white">
        {`NEXT_PUBLIC_SUPABASE_URL=https://<프로젝트>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon 키>
SUPABASE_SERVICE_ROLE_KEY=<service_role 키 · 서버 전용>
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
      </pre>
      <p className="m-0 text-sm text-ink-muted">연결 전까지 공개 홈페이지는 예시 데이터로 보입니다.</p>
    </main>
  );
}
