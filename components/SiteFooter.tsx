import Image from "next/image";
import Link from "next/link";
import { getChurchInfo } from "@/lib/queries";
import { Container } from "./ui";

export async function SiteFooter() {
  const church = await getChurchInfo();
  const year = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric" }).format(new Date());

  return (
    <footer className="border-t border-line bg-white text-ink">
      <Container className="flex flex-col gap-7 pt-10 pb-8 sm:gap-9 sm:pt-14 sm:pb-9">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:flex md:flex-wrap md:justify-between md:gap-10">
          <div className="col-span-2 flex flex-col gap-3 md:flex-[1_1_320px] md:gap-4">
            <Image
              src="/logos/dgc-signature-h-en-color.png"
              alt={church.name}
              width={200}
              height={40}
              className="h-8 w-auto self-start sm:h-10"
            />
            <address className="text-sm leading-[1.75] text-ink-muted not-italic sm:text-[15px]">
              {church.denomination} {church.name}
              <br />
              {church.address}
              <br />
              전화 {church.phone} · 사무실 {church.officeHours}
            </address>
          </div>
          <div className="flex flex-col gap-2 text-[15px] md:flex-[1_1_200px]">
            <p className="m-0 mb-1 font-bold">바로가기</p>
            <Link href="/worship" className="text-ink hover:text-primary">예배 시간</Link>
            <Link href="/visit#map" className="text-ink hover:text-primary">오시는 길</Link>
            <Link href="/bulletins" className="text-ink hover:text-primary">주보</Link>
            <Link href="/visit" className="text-ink hover:text-primary">처음 오셨나요</Link>
          </div>
          <div className="flex flex-col gap-2 text-[15px] md:flex-[1_1_200px]">
            <p className="m-0 mb-1 font-bold">공식 채널</p>
            {church.channels.map((c) =>
              c.href ? (
                <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-primary">
                  {c.label}
                </a>
              ) : (
                <span key={c.label} className="text-ink-muted">
                  {c.label} <span className="block text-xs sm:inline">(주소 확정 전)</span>
                </span>
              ),
            )}
          </div>
        </div>
        <p className="m-0 border-t border-line pt-5 text-xs leading-relaxed text-ink-muted sm:text-[13px]">
          © {year} {church.name}. 괄호 안 정보는 확정 후 관리자 페이지에서 입력합니다.
        </p>
      </Container>
    </footer>
  );
}
