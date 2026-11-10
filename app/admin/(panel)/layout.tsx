import Image from "next/image";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { ROLE_LABEL, requireStaff } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

// 관리자 레이아웃: 사이드 메뉴 (계획서 4장). proxy에 더해 여기서도 활성 관리자를 확인한다.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireStaff();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex flex-col gap-4 border-b border-line bg-white px-4 py-4 lg:w-60 lg:flex-none lg:border-r lg:border-b-0 lg:px-3 lg:py-6">
        <div className="flex items-center justify-between px-1 lg:flex-col lg:items-start lg:gap-1">
          <Link href="/admin" aria-label="관리자 대시보드">
            <Image src="/logos/dgc-signature-h-en-color.png" alt="동광교회" width={140} height={28} className="h-7 w-auto" />
          </Link>
          <span className="text-xs text-ink-muted">관리자</span>
        </div>
        <AdminNav isSuperAdmin={admin.role === "super_admin"} />
        <div className="mt-auto hidden flex-col gap-2 border-t border-line px-1 pt-4 text-sm lg:flex">
          <p className="m-0 font-bold">{admin.name || admin.email}</p>
          <p className="m-0 text-ink-muted">{ROLE_LABEL[admin.role]}</p>
          <Link href="/" target="_blank" rel="noopener" className="text-sm">홈페이지 보기 ↗</Link>
          <form action={signOut}>
            <button type="submit" className="text-ink-muted hover:text-ink">로그아웃</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-5 py-8 sm:px-8 lg:px-10">
        {children}
        <form action={signOut} className="mt-10 border-t border-line pt-4 text-sm lg:hidden">
          <span className="mr-3 text-ink-muted">{admin.name || admin.email} · {ROLE_LABEL[admin.role]}</span>
          <button type="submit" className="font-medium text-primary">로그아웃</button>
        </form>
      </main>
    </div>
  );
}
