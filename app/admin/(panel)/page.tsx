import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { checkNodeVersion } from "@/lib/node-security.mjs";
import { BANNER_COLUMNS } from "@/lib/banner-admin";
import { formatDot, formatMonthDay, formatTime } from "@/lib/date";
import { POST_TYPE_LABEL, POST_TYPES } from "@/lib/posts";
import { resolveBanner, type BannerRow } from "@/lib/main-banner";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "대시보드" };

type Props = { searchParams: Promise<{ welcome?: string; denied?: string }> };

const fmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default async function DashboardPage({ searchParams }: Props) {
  const { welcome, denied } = await searchParams;
  const admin = await requireStaff();
  const supabase = await createClient();
  const { data: bannerRows } = await supabase.from("main_banners").select(BANNER_COLUMNS).eq("status", "published");
  const season = resolveBanner((bannerRows ?? []) as BannerRow[]);

  const countOf = async (table: string, status: string) =>
    (await supabase.from(table).select("id", { count: "exact", head: true }).eq("status", status)).count ?? 0;
  const [drafts, published, bulletins, sermons, recentDrafts, upcoming] = await Promise.all([
    countOf("posts", "draft"),
    countOf("posts", "published"),
    countOf("bulletins", "published"),
    countOf("sermons", "published"),
    supabase.from("posts").select("id, type, title, updated_at").eq("status", "draft").order("updated_at", { ascending: false }).limit(5),
    supabase
      .from("posts")
      .select("id, title, event_start")
      .eq("type", "event")
      .eq("status", "published")
      .gte("event_start", new Date().toISOString())
      .order("event_start")
      .limit(5),
  ]);

  const stats = [
    { label: "게시 중인 소식", value: published },
    { label: "임시 저장 소식", value: drafts },
    { label: "게시된 주보", value: bulletins },
    { label: "게시된 설교", value: sermons },
  ];

  return (
    <div className="flex max-w-[960px] flex-col gap-8">
      <div>
        <h1 className="m-0 text-[26px] font-bold">안녕하세요, {admin.name || "관리자"}님</h1>
        <p className="m-0 mt-1 text-ink-muted">오늘 홈페이지 상태입니다.</p>
      </div>

      {welcome && <p role="status" className="m-0 rounded-card bg-primary-soft px-4 py-3 text-primary">비밀번호를 저장했습니다. 환영합니다!</p>}
      {denied && <p role="alert" className="m-0 rounded-card bg-[#fbeceb] px-4 py-3 text-[var(--danger)]">최고 관리자만 쓸 수 있는 메뉴입니다.</p>}

      <section aria-labelledby="season" className="rounded-card border border-line bg-white p-6">
        <h2 id="season" className="m-0 flex items-center justify-between text-sm font-medium text-label">
          메인 배너
          <Link href="/admin/banners" className="text-sm">배너 관리</Link>
        </h2>
        <p className="m-0 mt-2 text-xl font-bold">{season.source === "special" ? `특별 배너 게시 중 (${season.seasonName} 기간)` : `현재 절기: ${season.seasonName}`}</p>
        <p className="m-0 mt-1 text-[15px] text-ink-muted">
          {season.nextChangeAt ? `다음 전환: ${fmt.format(new Date(season.nextChangeAt))} (한국 시간)` : "다음 전환: 예정 없음"} · {season.reason}
        </p>
      </section>

      <section aria-label="콘텐츠 현황" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card border border-line bg-white p-5">
            <p className="m-0 text-sm text-ink-muted">{s.label}</p>
            <p className="m-0 mt-1 text-[28px] font-bold">{s.value}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="quick" className="flex flex-col gap-3">
        <h2 id="quick" className="m-0 text-lg font-bold">빠른 글쓰기</h2>
        <div className="flex flex-wrap gap-2">
          {POST_TYPES.map((t) => (
            <Link
              key={t}
              href={`/admin/posts/new?type=${t}`}
              className="inline-flex h-11 items-center rounded-card border-[1.5px] border-line bg-white px-5 text-[15px] font-bold text-ink hover:border-primary hover:text-primary"
            >
              + {POST_TYPE_LABEL[t]}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <MiniList
          title="이어서 쓸 임시 저장 글"
          empty="임시 저장 글이 없습니다."
          more={{ href: "/admin/posts?status=draft", label: "전체 보기" }}
          items={(recentDrafts.data ?? []).map((p) => ({
            href: `/admin/posts/${p.id}`,
            title: p.title,
            meta: `${POST_TYPE_LABEL[p.type as keyof typeof POST_TYPE_LABEL]} · ${formatDot(p.updated_at)} 수정`,
          }))}
        />
        <MiniList
          title="다가오는 행사"
          empty="게시된 예정 행사가 없습니다."
          more={{ href: "/admin/posts?type=event&status=published", label: "행사 보기" }}
          items={(upcoming.data ?? []).map((p) => ({
            href: `/admin/posts/${p.id}`,
            title: p.title,
            meta: `${formatMonthDay(p.event_start!)} ${formatTime(p.event_start!)}`,
          }))}
        />
      </div>

      {admin.role === "super_admin" && <ServerStatus />}
    </div>
  );
}

/** 서버의 Node.js가 알려진 보안 취약점(Node2Shell 등) 수정 버전인지 보여 준다. 최고 관리자에게만 보인다 */
function ServerStatus() {
  const node = checkNodeVersion();
  return (
    <section
      aria-label="서버 환경"
      className={`rounded-card border px-5 py-4 text-[15px] ${node.ok ? "border-line bg-white text-ink-muted" : "border-[#e9b8b3] bg-[#fbeceb] text-[var(--danger)]"}`}
    >
      <p className="m-0">
        서버 환경 · Node.js {node.version}
        {node.ok ? " · 알려진 보안 패치가 적용되어 있습니다." : " · 보안 패치가 필요합니다."}
      </p>
      {node.problems.map((p) => (
        <p key={p.id} className="m-0 mt-1 text-sm">
          {p.name}({p.id}) 수정 전 버전입니다.{" "}
          {p.fixed ? `${p.fixed} 이상이어야 합니다.` : "수정 버전이 공지된 Node 줄(22·24·26)이 아닙니다."} 홈페이지 개발 담당자에게 알려 주세요.
        </p>
      ))}
    </section>
  );
}

function MiniList({
  title,
  empty,
  more,
  items,
}: {
  title: string;
  empty: string;
  more: { href: string; label: string };
  items: { href: string; title: string; meta: string }[];
}) {
  return (
    <section className="flex flex-col rounded-card border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="m-0 text-[15px] font-bold">{title}</h2>
        <Link href={more.href} className="text-sm">{more.label}</Link>
      </div>
      {items.length === 0 ? (
        <p className="m-0 px-5 py-6 text-[15px] text-ink-muted">{empty}</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="flex flex-col gap-0.5 px-5 py-3 text-ink hover:bg-[#fafaf8] hover:text-ink">
                <span className="font-medium break-keep">{i.title}</span>
                <span className="text-sm text-ink-muted">{i.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
