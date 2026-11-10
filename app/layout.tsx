import type { Metadata } from "next";
import { AuthHashRedirect } from "@/components/AuthHashRedirect";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "동광교회", template: "%s | 동광교회" },
  description: "사랑과 나눔을 배우고 실천하는 동광교회. 예배 시간, 오시는 길, 처음 방문 안내, 교회 소식을 확인하세요.",
  icons: { icon: "/logos/dgc-symbol-color.png" },
  openGraph: { siteName: "동광교회", locale: "ko_KR", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" />
      </head>
      <body className="flex min-h-screen flex-col bg-white text-ink">
        <AuthHashRedirect />
        {children}
      </body>
    </html>
  );
}
