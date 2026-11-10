// 개발 계획서 5.1의 테이블과 같은 모양. 2단계에서 Supabase 쿼리 결과로 교체한다.

export type Status = "draft" | "published" | "unpublished" | "trashed";

export type PostType = "notice" | "event" | "story";

export type Post = {
  id: string;
  type: PostType;
  title: string;
  summary: string;
  body: string;
  status: Status;
  isPinned: boolean;
  publishedAt: string;
  publishStart?: string;
  publishEnd?: string;
  eventStart?: string;
  eventEnd?: string;
  eventPlace?: string;
  eventTarget?: string;
  applyUrl?: string;
  /** 공개 동의한 사진과 첨부파일 (상세 화면만) */
  files?: PostFileView[];
};

export type PostFileView = { kind: "image" | "attachment"; url: string; name: string; size: number };

export type Bulletin = {
  id: string;
  date: string;
  title: string;
  filePath: string | null;
  note?: string;
  status: Status;
};

export type Sermon = {
  id: string;
  title: string;
  scripture: string;
  preacher: string;
  preachedOn: string;
  videoUrl: string | null;
  summary: string;
  status: Status;
};

export type WorshipTime = {
  id: string;
  name: string;
  target: string;
  weekday: string;
  startTime: string;
  place: string;
  isOnline: boolean;
  isMain: boolean;
  isActive: boolean;
};

export type Community = {
  id: string;
  name: string;
  target: string;
  ageRange: string;
  meetTime: string;
  place: string;
  activities: string;
  howToJoin: string;
  isActive: boolean;
};

export type Faq = { id: string; question: string; answer: string; isActive: boolean };

export type Value = { title: string; body: string };

export type ChurchInfo = {
  name: string;
  nameEn: string;
  denomination: string;
  address: string;
  phone: string;
  officeHours: string;
  mapUrl: string | null;
  parking: { headline: string; detail: string };
  transit: string;
  accessibility: string;
  channels: { label: string; href: string | null }[];
  intro: string;
  values: Value[];
  pastorGreeting: { name: string; body: string };
  staff: { role: string; name: string }[];
  history: { year: string; text: string }[];
  welcomeSteps: Value[];
  visitSteps: Value[];
};
