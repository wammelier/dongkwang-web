import Image from "next/image";
import Link from "next/link";
import { formatDot, formatLong, formatMonthDay } from "@/lib/date";
import { POST_TYPE_LABEL } from "@/lib/posts";
import { preacherLabel } from "@/lib/sermons";
import type { Bulletin, ChurchInfo, Community, Post, Sermon, Value, WorshipTime } from "@/lib/types";
import { Badge, Button, Container, Eyebrow, IconTile, Icons, SectionHeading, TextLink } from "./ui";

/* 2. 예배·방문 핵심 정보 */
export function WorshipStrip({
  worship,
  church,
  bulletin,
}: {
  worship: WorshipTime | null;
  church: ChurchInfo;
  bulletin: Bulletin | null;
}) {
  const items = [
    worship && {
      icon: Icons.clock,
      label: worship.name,
      value: worship.startTime,
      sub: <span>{worship.place}</span>,
    },
    {
      icon: Icons.pin,
      label: "오시는 길",
      value: church.address,
      sub: <Link href="/visit#map">지도에서 길찾기</Link>,
    },
    {
      icon: Icons.car,
      label: "주차",
      value: church.parking.headline,
      sub: <span>{church.parking.detail}</span>,
    },
    bulletin && {
      icon: Icons.doc,
      label: "이번 주 주보",
      value: `${formatMonthDay(bulletin.date).replace(/ \(.+\)/, "")} 주보`,
      sub: <Link href="/bulletins">주보 바로가기{bulletin.filePath ? " (PDF)" : ""}</Link>,
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; sub: React.ReactNode }[];

  return (
    <section aria-label="예배와 방문 핵심 정보" className="border-b border-line bg-white">
      <Container className="grid grid-cols-2 gap-2.5 py-5 sm:gap-x-5 sm:py-10 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-2 rounded-card bg-accent-soft p-3.5 sm:flex-row sm:items-start sm:gap-3.5 sm:bg-transparent sm:p-0 sm:py-4"
          >
            <IconTile>{item.icon}</IconTile>
            <div className="min-w-0">
              <p className="m-0 text-[13px] text-ink-muted sm:text-sm">{item.label}</p>
              <p className="m-0 text-base leading-[1.4] font-bold break-keep sm:text-[19px]">{item.value}</p>
              <p className="m-0 mt-0.5 text-[12px] leading-snug font-medium text-ink-muted sm:text-[13px]">{item.sub}</p>
            </div>
          </div>
        ))}
      </Container>
    </section>
  );
}

/* 3. 처음 오신 분 환영 */
export function WelcomeSteps({ steps, headline, body }: { steps: Value[]; headline: string; body: string }) {
  return (
    <section id="welcome" aria-labelledby="welcome-title" className="bg-white">
      <Container className="flex flex-wrap items-start gap-6 py-12 sm:gap-12 sm:py-20">
        <div className="flex flex-[1_1_360px] flex-col gap-3 sm:gap-4">
          <Eyebrow>처음 오셨나요</Eyebrow>
          <h2 id="welcome-title" className="m-0 text-[26px] leading-[1.3] font-bold tracking-[-0.01em] break-keep whitespace-pre-line sm:text-[30px]">
            {headline}
          </h2>
          {body && <p className="m-0 break-keep text-ink-muted">{body}</p>}
          {/* 모바일에서는 단계 목록 아래에 보여준다 */}
          <div className="hidden sm:block">
            <Button href="/visit">방문 안내 자세히</Button>
          </div>
        </div>
        <StepList steps={steps} className="flex-[1_1_520px]" />
        <div className="w-full sm:hidden">
          <Button href="/visit" className="w-full">
            방문 안내 자세히
          </Button>
        </div>
      </Container>
    </section>
  );
}

export function StepList({ steps, className = "" }: { steps: Value[]; className?: string }) {
  return (
    <ol className={`m-0 flex list-none flex-col gap-2.5 p-0 sm:gap-3 ${className}`}>
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="flex gap-3.5 rounded-card border border-line bg-white px-4 py-4 sm:gap-[18px] sm:px-6 sm:py-[22px]"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary sm:h-9 sm:w-9 sm:text-[15px]"
          >
            {i + 1}
          </span>
          <div>
            <p className="m-0 text-[17px] leading-[1.4] font-bold sm:text-lg">{step.title}</p>
            <p className="m-0 mt-1 text-[14px] leading-relaxed text-ink-muted sm:text-[15px]">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* 4. 교회 소개 */
export function ValueCards({ values }: { values: Value[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
      {values.map((v) => (
        <div
          key={v.title}
          className="flex flex-col gap-1 border-l-[3px] border-accent bg-white py-0.5 pl-4 md:gap-2.5 md:rounded-card md:border-t-[3px] md:border-l-0 md:px-6 md:py-7"
        >
          <p className="m-0 text-lg font-bold md:text-xl">{v.title}</p>
          <p className="m-0 text-[15px] leading-relaxed text-ink-muted">{v.body}</p>
        </div>
      ))}
    </div>
  );
}

export function AboutSummary({ values, headline, body }: { values: Value[]; headline: string; body: string }) {
  return (
    <section id="about" aria-labelledby="about-title" className="bg-white">
      <Container className="flex flex-col gap-6 py-12 sm:gap-8 sm:py-[72px]">
        <SectionHeading eyebrow="교회 소개" title={<span id="about-title">{headline}</span>} description={body || undefined} />
        <ValueCards values={values} />
        <TextLink href="/about">교회 소개 · 섬기는 사람들 · 연혁 보기</TextLink>
      </Container>
    </section>
  );
}

/* 5. 최근 말씀 */
export function SermonVideo({ sermon, priority = false }: { sermon: Sermon; priority?: boolean }) {
  const inner = (
    <>
      <Image src="/photos/sermon.jpg" alt="" fill priority={priority} sizes="(min-width: 1024px) 560px, 100vw" className="object-cover object-[center_30%]" />
      <span aria-hidden="true" className="absolute inset-0 bg-ink/20" />
      <span aria-hidden="true" className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--ink)">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </>
  );
  const cls =
    "relative flex aspect-video items-center justify-center overflow-hidden rounded-card sm:aspect-auto sm:h-[320px]";
  return sermon.videoUrl ? (
    <a href={sermon.videoUrl} target="_blank" rel="noopener noreferrer" aria-label={`${sermon.title} 설교 영상 보기`} className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={`/sermons/${sermon.id}`} aria-label={`${sermon.title} 설교 자세히`} className={cls}>
      {inner}
    </Link>
  );
}

/** imagePriority: 휴대폰 첫 화면에 걸리는 곳(예배 안내)에서 사진을 먼저 받는다 */
export function RecentSermon({ sermon, imagePriority = false }: { sermon: Sermon; imagePriority?: boolean }) {
  return (
    <section id="sermon" aria-labelledby="sermon-title" className="bg-white">
      <Container className="grid grid-cols-1 items-center gap-6 py-12 sm:gap-10 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
        <SermonVideo sermon={sermon} priority={imagePriority} />
        <div className="flex flex-col gap-2.5 sm:gap-3.5">
          <Eyebrow>최근 말씀</Eyebrow>
          <h2 id="sermon-title" className="m-0 text-[26px] leading-[1.3] font-bold tracking-[-0.01em] sm:text-[30px]">
            {sermon.title}
          </h2>
          <p className="m-0 text-[15px] text-ink-muted">
            {[sermon.scripture, preacherLabel(sermon.preacher), formatLong(sermon.preachedOn)].filter(Boolean).join(" · ")}
          </p>
          <p className="m-0 text-ink-muted">{sermon.summary}</p>
          <div className="mt-1 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
            {sermon.videoUrl ? (
              <Button href={sermon.videoUrl} target="_blank" rel="noopener noreferrer">
                영상 보기
              </Button>
            ) : (
              <Button href={`/sermons/${sermon.id}`}>말씀 자세히</Button>
            )}
            <Button href="/sermons" variant="outline">
              설교 목록
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* 6. 교회 소식 */
export function PostCard({ post }: { post: Post }) {
  const isEvent = post.type === "event";
  return (
    <article className="relative flex flex-col gap-2 rounded-card border border-line bg-white p-5 hover:border-primary sm:gap-2.5 sm:p-6">
      <div className="flex items-center gap-2">
        {post.isPinned ? <Badge tone="important">중요</Badge> : <Badge tone={post.type}>{TYPE_LABEL[post.type]}</Badge>}
        <span className="text-sm text-ink-muted">
          {isEvent && post.eventStart
            ? `${formatMonthDay(post.eventStart)} 시작`
            : `${post.isPinned ? `${TYPE_LABEL[post.type]} · ` : ""}${formatDot(post.publishedAt)}`}
        </span>
      </div>
      <h3 className="m-0 text-lg leading-[1.4] font-bold sm:text-[19px]">
        {/* 제목 링크가 카드 전체를 덮어 어디를 눌러도 열린다 */}
        <Link href={`/news/${post.id}`} className="text-ink after:absolute after:inset-0 after:rounded-card hover:text-primary">
          {post.title}
        </Link>
      </h3>
      <p className="m-0 text-[15px] text-ink-muted">{post.summary}</p>
      <span aria-hidden="true" className="mt-auto text-sm font-medium text-primary">
        {isEvent ? "일정과 신청 →" : "자세히 보기 →"}
      </span>
    </article>
  );
}

export function BulletinCard({ bulletin }: { bulletin: Bulletin }) {
  return (
    <article className="flex flex-col gap-2 rounded-card border border-line bg-white p-5 sm:gap-2.5 sm:p-6">
      <div className="flex items-center gap-2">
        <Badge tone="bulletin">주보</Badge>
        <span className="text-sm text-ink-muted">{formatDot(bulletin.date)}</span>
      </div>
      <h3 className="m-0 text-lg leading-[1.4] font-bold sm:text-[19px]">{bulletin.title}</h3>
      {bulletin.note && <p className="m-0 text-[15px] text-ink-muted">{bulletin.note}</p>}
      {bulletin.filePath ? (
        <a href={bulletin.filePath} target="_blank" rel="noopener noreferrer" className="mt-auto text-sm font-medium">
          {/\.pdf$/i.test(bulletin.filePath) ? "주보 열기 (PDF)" : "주보 보기"}
        </a>
      ) : (
        <Link href="/bulletins" className="mt-auto text-sm font-medium">
          주보 목록
        </Link>
      )}
    </article>
  );
}

export const TYPE_LABEL = POST_TYPE_LABEL;

export function NewsCards({ posts, bulletin, headline, body }: { posts: Post[]; bulletin: Bulletin | null; headline: string; body: string }) {
  const count = posts.length + (bulletin ? 1 : 0);
  return (
    <section id="news" aria-labelledby="news-title" className="bg-white">
      <Container className="flex flex-col gap-5 py-12 sm:gap-7 sm:py-[72px]">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading eyebrow="교회 소식" title={<span id="news-title">{headline}</span>} description={body || undefined} />
          <TextLink href="/news" className="self-end">
            전체 소식 보기
          </TextLink>
        </div>
        {/* 모바일: 옆으로 넘기는 카드. 다음 카드가 살짝 보여 넘길 수 있음을 알린다 */}
        <div
          className={`-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] *:w-[80%] *:flex-none *:snap-start sm:mx-0 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:*:w-auto md:grid-cols-2 ${
            count >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          }`}
        >
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {bulletin && <BulletinCard bulletin={bulletin} />}
        </div>
      </Container>
    </section>
  );
}

/* 7. 함께하는 공동체 */
export function CommunityChips({ communities, headline, body }: { communities: Community[]; headline: string; body: string }) {
  return (
    <section id="community" aria-labelledby="community-title" className="bg-white">
      <Container className="flex flex-col gap-5 py-12 sm:gap-7 sm:py-20">
        <SectionHeading
          eyebrow="함께하는 공동체"
          title={<span id="community-title">{headline}</span>}
          description={body || undefined}
        />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
          {communities.map((c) => (
            <Link
              key={c.id}
              href={`/community#${c.id}`}
              className="flex flex-col gap-0.5 rounded-card border border-line bg-white px-4 py-3.5 text-ink hover:border-primary hover:text-ink sm:gap-1 sm:px-[22px] sm:py-[18px]"
            >
              <span className="text-base font-bold sm:text-lg">{c.name}</span>
              <span className="text-[13px] leading-snug text-ink-muted sm:text-sm">
                {c.ageRange} · {c.meetTime}
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
