import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-[1160px] px-5 sm:px-8 ${className}`}>{children}</div>;
}

type ButtonProps = ComponentProps<typeof Link> & { variant?: "primary" | "outline"; size?: "md" | "lg" };

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover hover:text-on-primary",
  outline: "border-[1.5px] border-[var(--line-strong)] text-ink hover:border-ink hover:text-ink",
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  return (
    <Link
      {...props}
      className={`inline-flex items-center justify-center rounded-card px-4 text-[15px] font-bold whitespace-nowrap transition-colors sm:px-[22px] sm:text-base ${
        size === "lg" ? "h-[50px] px-6" : "h-12"
      } ${variants[variant]} ${className}`}
    />
  );
}

/** 외부 링크가 아직 없으면(관리자 미입력) 버튼 대신 안내 문구 */
export function ExternalButton({
  href,
  children,
  fallback,
  variant = "primary",
}: {
  href: string | null;
  children: ReactNode;
  fallback: string;
  variant?: "primary" | "outline";
}) {
  if (!href) return <span className="text-sm text-ink-muted">{fallback}</span>;
  return (
    <Button href={href} variant={variant} target="_blank" rel="noopener noreferrer">
      {children}
    </Button>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm font-medium text-label">{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Tag = "h2",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex max-w-[640px] flex-col gap-2">
      <Eyebrow>{eyebrow}</Eyebrow>
      <Tag className="m-0 text-[24px] leading-[1.35] font-bold tracking-[-0.02em] break-keep sm:text-[30px] sm:leading-[1.3]">{title}</Tag>
      {description && <p className="m-0 mt-1 text-[15px] leading-relaxed break-keep text-ink-muted sm:mt-2 sm:text-[17px]">{description}</p>}
    </div>
  );
}

export function TextLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={`self-start border-b border-primary text-[15px] font-medium leading-normal ${className}`}
    />
  );
}

const badgeTones = {
  important: "bg-badge text-white",
  event: "bg-accent-soft text-ink-muted",
  bulletin: "bg-primary-soft text-primary",
  story: "bg-accent-soft text-ink-muted",
  notice: "bg-accent-soft text-ink-muted",
};

export function Badge({ tone, children }: { tone: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span className={`rounded px-[9px] py-[3px] text-xs font-bold leading-normal ${badgeTones[tone]}`}>{children}</span>
  );
}

/** 하위 페이지 제목 영역 */
export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="border-b border-line">
      <Container className="py-9 sm:py-[72px]">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} description={description} />
      </Container>
    </div>
  );
}

export function IconTile({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 flex-none items-center justify-center rounded-card bg-primary-soft text-primary"
    >
      {children}
    </span>
  );
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Icons = {
  clock: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  pin: (
    <svg {...iconProps}>
      <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  car: (
    <svg {...iconProps}>
      <path d="M5 17h14l-1.5-5.5a2 2 0 0 0-1.9-1.5H8.4a2 2 0 0 0-1.9 1.5L5 17z" />
      <path d="M7 17v2M17 17v2M5 13h14" />
    </svg>
  ),
  doc: (
    <svg {...iconProps}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 12h5M10 16h5" />
    </svg>
  ),
  phone: (
    <svg {...iconProps}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </svg>
  ),
  bus: (
    <svg {...iconProps}>
      <rect x="5" y="3" width="14" height="15" rx="2" />
      <path d="M5 11h14M8 18v2M16 18v2M8.5 14.5h.01M15.5 14.5h.01" />
    </svg>
  ),
  walk: (
    <svg {...iconProps}>
      <circle cx="13" cy="4.5" r="1.5" />
      <path d="M9 21l2-6 3 3v3M7 12l3-4h4l2 4M11 15l1-5" />
    </svg>
  ),
};
