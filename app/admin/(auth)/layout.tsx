import Image from "next/image";
import Link from "next/link";

// 로그인·비밀번호 화면: 가운데 카드
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-[420px] rounded-card border border-line bg-white p-8 shadow-[0_10px_30px_rgba(31,61,54,0.08)]">
        <Link href="/" aria-label="동광교회 홈으로" className="mb-6 inline-block">
          <Image src="/logos/dgc-signature-h-en-color.png" alt="동광교회" width={170} height={34} className="h-8 w-auto" />
        </Link>
        {children}
      </div>
      <Link href="/" className="mt-6 text-sm text-ink-muted hover:text-primary">
        ← 홈페이지로 돌아가기
      </Link>
    </main>
  );
}
