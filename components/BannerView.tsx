import Image from "next/image";
import type { ResolvedBanner } from "@/lib/main-banner";
import { Button } from "./ui";

type View = Pick<ResolvedBanner, "eyebrow" | "title" | "description" | "primary">;

// 휴대폰 미리보기는 화면 너비와 상관없이 휴대폰 모양으로 그린다 (관리자 미리보기용)
const CLS = {
  auto: {
    wrap: "gap-3.5 px-5 pt-10 pb-9 sm:gap-5 sm:px-8 md:pt-24 md:pb-20",
    eyebrow: "text-[13px] sm:text-sm",
    title: "text-[30px] leading-[1.3] sm:text-[42px] sm:leading-[1.25] lg:text-[48px]",
    desc: "text-base sm:text-lg",
    buttons: "grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3",
    logo: "hidden md:block",
  },
  mobile: {
    wrap: "gap-3.5 px-5 pt-10 pb-9",
    eyebrow: "text-[13px]",
    title: "text-[30px] leading-[1.3]",
    desc: "text-base",
    buttons: "grid grid-cols-2 gap-2.5",
    logo: "hidden",
  },
};

/**
 * 메인 배너 화면 — 이미지 없이 문구만 (기획서 15장).
 * 특별 배너는 행사 버튼 + 예배 안내, 절기 배너는 예배 안내 + 처음 오셨나요.
 */
export function BannerView({ banner, mobile = false, preview = false }: { banner: View; mobile?: boolean; preview?: boolean }) {
  const c = CLS[mobile ? "mobile" : "auto"];
  const Heading = preview ? "p" : "h1";
  const external = banner.primary && /^https?:/.test(banner.primary.href);
  return (
    <section
      id={preview ? undefined : "top"}
      aria-labelledby={preview ? undefined : "season-title"}
      aria-label={preview ? "배너 미리보기" : undefined}
      className="relative overflow-hidden border-b border-line bg-white"
    >
      {/* 로고 심볼을 옅게 깐 장식 — 이미지 배너 대신 브랜드 감만 남긴다 */}
      <Image
        src="/logos/dgc-symbol-color.png"
        alt=""
        aria-hidden="true"
        width={195}
        height={302}
        className={`pointer-events-none absolute top-1/2 -right-24 h-[460px] w-auto -translate-y-1/2 opacity-[0.07] lg:right-[max(0px,calc(50%-640px))] ${c.logo}`}
      />
      <div className={`relative mx-auto flex w-full max-w-[1160px] flex-col ${c.wrap}`}>
        <p className={`m-0 flex items-center gap-2.5 font-medium tracking-[0.04em] text-label ${c.eyebrow}`}>
          <span aria-hidden="true" className="h-0.5 w-6 rounded-full bg-accent" />
          {banner.eyebrow}
        </p>
        <Heading id={preview ? undefined : "season-title"} className={`m-0 font-bold tracking-[-0.02em] break-keep whitespace-pre-line text-ink ${c.title}`}>
          {banner.title}
        </Heading>
        {banner.description && <p className={`m-0 max-w-[560px] leading-[1.7] break-keep text-ink-muted ${c.desc}`}>{banner.description}</p>}
        <div className={`mt-2 ${c.buttons}`}>
          {banner.primary ? (
            <>
              <Button href={banner.primary.href} size="lg" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {banner.primary.label}
              </Button>
              <Button href="/worship" size="lg" variant="outline">
                예배 안내
              </Button>
            </>
          ) : (
            <>
              <Button href="/worship" size="lg">
                예배 안내
              </Button>
              <Button href="/visit" size="lg" variant="outline">
                처음 오셨나요
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
