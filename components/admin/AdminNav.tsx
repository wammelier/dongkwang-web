"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; ready: boolean; superOnly?: boolean };

// 계획서 6.2 메뉴. ready=false는 다음 단계에서 만들 화면
const ITEMS: Item[] = [
  { href: "/admin", label: "대시보드", ready: true },
  { href: "/admin/posts", label: "공지·행사·이야기", ready: true },
  { href: "/admin/bulletins", label: "주보", ready: true },
  { href: "/admin/sermons", label: "설교", ready: true },
  { href: "/admin/main", label: "메인 구역", ready: true },
  { href: "/admin/banners", label: "절기 배너", ready: true },
  { href: "/admin/church-info", label: "교회 정보", ready: true, superOnly: true },
  { href: "/admin/accounts", label: "관리자 계정", ready: true, superOnly: true },
];

export function AdminNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 메뉴">
      <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 lg:flex-col">
        {ITEMS.filter((i) => !i.superOnly || isSuperAdmin).map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-none">
              {item.ready ? (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center rounded-card px-3 text-[15px] font-medium ${
                    active ? "bg-primary-soft text-primary" : "text-ink hover:bg-accent-soft hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <span className="flex h-11 items-center gap-2 px-3 text-[15px] text-ink-muted" aria-disabled="true">
                  {item.label}
                  <span className="rounded bg-accent-soft px-1.5 text-[11px]">준비 중</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
