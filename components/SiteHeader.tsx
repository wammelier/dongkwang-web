"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const MENU = [
  { href: "/about", label: "교회 소개" },
  { href: "/worship", label: "예배·말씀", match: ["/worship", "/sermons"] },
  { href: "/community", label: "다음세대·공동체" },
  { href: "/news", label: "교회 소식", match: ["/news", "/bulletins"] },
];

export function SiteHeader() {
  const pathname = usePathname();
  // 어느 페이지에서 열었는지 기억한다. 다른 페이지로 이동하면 저절로 닫힌다 (효과 안에서 상태를 바꾸지 않기 위해)
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (value: boolean) => setOpenPath(value ? pathname : null);

  // 메뉴가 열려 있는 동안 뒤 페이지 스크롤을 막고 Esc로 닫는다
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenPath(null);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (item: (typeof MENU)[number]) =>
    (item.match ?? [item.href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <>
    {open && (
      // 헤더 밖에 둔다: header의 backdrop-blur가 fixed 자식의 기준을 헤더로 바꿔 버리기 때문
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-20 bg-ink/40 lg:hidden"
      />
    )}
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[56px] max-w-[1160px] items-center gap-8 px-4 sm:min-h-[76px] sm:px-8">
        <Link href="/" aria-label="동광교회 홈으로" className="flex items-center">
          <Image
            src="/logos/dgc-signature-h-en-color.png"
            alt="동광교회 DONG GWANG CHURCH"
            width={190}
            height={38}
            priority
            className="h-7 w-auto sm:h-[38px]"
          />
        </Link>

        <nav aria-label="주 메뉴" className="ml-auto hidden items-center gap-[26px] text-[15px] font-medium lg:flex">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={`border-b-2 py-2 text-ink hover:text-primary ${
                isActive(item) ? "border-accent" : "border-transparent"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <VisitButton />
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <VisitButton />
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen(!open)}
            className="flex h-11 w-11 items-center justify-center rounded-card text-ink hover:bg-accent-soft"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="주 메뉴"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-56px)] sm:max-h-[calc(100dvh-76px)] overflow-y-auto border-t border-line bg-white shadow-[0_20px_48px_rgba(31,61,54,0.18)] lg:hidden"
        >
          <ul className="mx-auto flex max-w-[1160px] flex-col px-4 py-1 sm:px-8">
            {MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item) ? "page" : undefined}
                  className={`flex min-h-[54px] items-center justify-between border-b border-line text-[17px] font-medium ${
                    isActive(item) ? "text-primary" : "text-ink"
                  }`}
                >
                  {item.label}
                  <Chevron />
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/bulletins"
                className="flex min-h-[54px] items-center justify-between text-[17px] font-medium text-ink"
              >
                이번 주 주보
                <Chevron />
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
    </>
  );
}

function VisitButton() {
  return (
    <Link
      href="/visit"
      className="inline-flex h-9 items-center rounded-card bg-primary px-3 text-sm font-bold leading-none text-on-primary hover:bg-primary-hover hover:text-on-primary sm:h-auto sm:px-[18px] sm:py-[11px] sm:text-[15px]"
    >
      처음 오셨나요
    </Link>
  );
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-muted">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
