// 메인 페이지에서 관리자가 켜고 끄고 순서를 바꿀 수 있는 구역.
// 절기 배너와 예배·방문 정보는 기획서 4장에 따라 맨 위 고정이라 목록에 없다.

export const SECTION_KEYS = ["welcome", "about", "sermon", "news", "community"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** headline·body가 비어 있으면 SECTION_TEXT 기본 문구 */
export type SectionSetting = { key: SectionKey; isVisible: boolean; headline?: string; body?: string };

/** 구역 제목·소개 기본 문구 (최근 말씀은 설교 제목이 제목이라 고칠 문구가 없음) */
export const SECTION_TEXT: Partial<Record<SectionKey, { headline: string; body: string }>> = {
  welcome: {
    headline: "문 앞에서부터\n함께 걸어 드립니다",
    body: "등록이나 준비 없이 오셔도 됩니다. 작은 교회라 누가 오셨는지 금방 알아보고, 자리와 자녀 예배실을 안내해 드립니다.",
  },
  about: { headline: "우리는 이렇게 믿고, 이렇게 살아갑니다", body: "" },
  news: { headline: "이번 주 알려드립니다", body: "" },
  community: { headline: "작지만 모두의 자리가 있습니다", body: "영유아부터 장년까지, 나와 가족이 함께할 모임을 찾아보세요." },
};

/** 화면에 쓸 문구: 고친 문구 → 기본 문구 */
export function sectionText(setting: SectionSetting | undefined, key: SectionKey) {
  const fallback = SECTION_TEXT[key] ?? { headline: "", body: "" };
  return { headline: setting?.headline?.trim() || fallback.headline, body: setting?.body?.trim() || fallback.body };
}

export const SECTION_INFO: Record<SectionKey, { label: string; description: string }> = {
  welcome: { label: "처음 오신 분", description: "첫 방문 과정 3단계와 방문 안내 버튼" },
  about: { label: "교회 소개", description: "핵심 가치 3가지와 소개 페이지 링크" },
  sermon: { label: "최근 말씀", description: "가장 최근 설교 1건 (설교가 없으면 자동으로 숨김)" },
  news: { label: "교회 소식", description: "고정 공지·최신 소식과 이번 주 주보 (없으면 자동으로 숨김)" },
  community: { label: "함께하는 공동체", description: "운영 중인 모임 목록 (없으면 자동으로 숨김)" },
};

export const FIXED_SECTIONS = ["절기 배너", "예배·주소·주차·주보 안내"];

export const DEFAULT_SECTIONS: SectionSetting[] = SECTION_KEYS.map((key) => ({ key, isVisible: true }));

const isSectionKey = (v: unknown): v is SectionKey => SECTION_KEYS.includes(v as SectionKey);

/** DB 행을 정렬하고, 빠진 구역은 기본값(켜짐)으로 끝에 붙인다. 모르는 키는 버린다. */
export function normalizeSections(rows: { key: string; is_visible: boolean; sort: number; headline?: string; body?: string }[]): SectionSetting[] {
  const known = rows
    .filter((r) => isSectionKey(r.key))
    .sort((a, b) => a.sort - b.sort)
    .map((r) => ({ key: r.key as SectionKey, isVisible: r.is_visible, headline: r.headline ?? "", body: r.body ?? "" }));
  const missing = SECTION_KEYS.filter((k) => !known.some((s) => s.key === k)).map((key) => ({ key, isVisible: true }));
  return [...known, ...missing];
}
