// Supabase 행(snake_case) → 화면용 타입. lib/types.ts 모양을 유지해 컴포넌트는 데이터 출처를 모른다.
import type { Bulletin, ChurchInfo, Community, Faq, Post, Sermon, WorshipTime } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any -- 생성된 DB 타입 도입 전까지 행은 any로 받는다 */
type Row = Record<string, any>;

const WEEKDAY = ["주일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

/** '14:00:00' → '오후 2:00' */
export function formatClock(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(m).padStart(2, "0")}`;
}

export const toPost = (r: Row): Post => ({
  id: r.id,
  type: r.type,
  title: r.title,
  summary: r.summary,
  body: r.body,
  status: r.status,
  isPinned: r.is_pinned,
  publishedAt: r.published_at ?? r.created_at,
  publishStart: r.publish_start ?? undefined,
  publishEnd: r.publish_end ?? undefined,
  eventStart: r.event_start ?? undefined,
  eventEnd: r.event_end ?? undefined,
  eventPlace: r.event_place ?? undefined,
  eventTarget: r.event_target ?? undefined,
  applyUrl: r.apply_url ?? undefined,
});

export const toBulletin = (r: Row, publicUrl: (path: string) => string): Bulletin => ({
  id: r.id,
  date: r.date,
  title: r.title,
  filePath: r.file_path ? publicUrl(r.file_path) : null,
  note: r.note || undefined,
  status: r.status,
});

export const toSermon = (r: Row): Sermon => ({
  id: r.id,
  title: r.title,
  scripture: r.scripture,
  preacher: r.preacher,
  preachedOn: r.preached_on,
  videoUrl: r.video_url,
  summary: r.summary,
  status: r.status,
});

export const toWorshipTime = (r: Row): WorshipTime => ({
  id: r.id,
  name: r.name,
  target: r.target,
  weekday: WEEKDAY[r.weekday] ?? "",
  startTime: formatClock(r.start_time),
  place: r.place,
  isOnline: r.is_online,
  isMain: r.is_main,
  isActive: r.is_active,
});

export const toCommunity = (r: Row): Community => ({
  id: r.slug,
  name: r.name,
  target: r.target,
  ageRange: r.age_range,
  meetTime: r.meet_time,
  place: r.place,
  activities: r.activities,
  howToJoin: r.how_to_join,
  isActive: r.is_active,
});

export const toFaq = (r: Row): Faq => ({ id: r.id, question: r.question, answer: r.answer, isActive: r.is_active });

export const toChurchInfo = (r: Row): ChurchInfo => ({
  name: r.name,
  nameEn: r.name_en,
  denomination: r.denomination,
  address: r.address,
  phone: r.phone,
  officeHours: r.office_hours,
  mapUrl: r.map_url,
  parking: { headline: r.parking_headline, detail: r.parking_detail },
  transit: r.transit,
  accessibility: r.accessibility,
  channels: r.channels ?? [],
  intro: r.intro,
  values: r.values ?? [],
  pastorGreeting: { name: r.pastor_name, body: r.pastor_greeting },
  staff: r.staff ?? [],
  history: r.history ?? [],
  welcomeSteps: r.welcome_steps ?? [],
  visitSteps: r.visit_steps ?? [],
});
