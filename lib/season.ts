// 교회력 자동 배너 계산 (기획서 15장)
// 모든 날짜는 Asia/Seoul 달력 기준 'YYYY-MM-DD' 문자열. 기간은 시작 포함, 종료 미포함.

export type SeasonKey =
  | "advent"
  | "christmas"
  | "epiphany"
  | "lent"
  | "palm-sunday"
  | "holy-week"
  | "easter"
  | "pentecost"
  | "ordinary"
  | "thanksgiving";

export type SeasonRange = { key: SeasonKey; start: string; end: string };
export type SeasonSelection = SeasonRange & { reason: string };

export type SeasonOptions = {
  /** 추수감사 배너 사용 여부 (기본 비활성, 기획서 15.3) */
  thanksgiving?: boolean;
};

const DAY = 86_400_000;
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
export const iso = (d: Date) => d.toISOString().slice(0, 10);

/** 그레고리력 부활절 (익명 그레고리력 알고리즘) */
export function easter(y: number): Date {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return utc(y, Math.floor(n / 31), (n % 31) + 1);
}

/** 대림절 첫 주일: 12월 25일보다 앞선 네 번째 일요일 (성탄절이 일요일이어도 당일은 세지 않음) */
export function adventSunday(y: number): Date {
  const christmas = utc(y, 12, 25);
  return addDays(christmas, -(christmas.getUTCDay() || 7) - 21);
}

/** 추수감사주일 설정 예: 11월 셋째 일요일 */
export function thanksgivingSunday(y: number): Date {
  const first = utc(y, 11, 1);
  return addDays(first, ((7 - first.getUTCDay()) % 7) + 14);
}

/** 한 해(1/1~12/31)를 빈틈없이 덮는 기본 배너 일정 */
export function calendar(y: number): SeasonRange[] {
  if (!Number.isInteger(y) || y < 1900 || y > 2199) {
    throw new RangeError("연도는 1900~2199 사이여야 합니다.");
  }
  const E = easter(y);
  const A = adventSunday(y);
  const bounds: [SeasonKey, Date][] = [
    ["christmas", utc(y, 1, 1)],
    ["epiphany", utc(y, 1, 6)],
    ["lent", addDays(E, -46)],
    ["palm-sunday", addDays(E, -7)],
    ["holy-week", addDays(E, -6)],
    ["easter", E],
    ["pentecost", addDays(E, 49)],
    ["ordinary", addDays(E, 56)],
    ["advent", A],
    ["christmas", utc(y, 12, 25)],
  ];
  return bounds.map(([key, start], i) => ({
    key,
    start: iso(start),
    end: iso(bounds[i + 1]?.[1] ?? utc(y + 1, 1, 1)),
  }));
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`날짜 형식이 아닙니다: ${value}`);
  const [y, m, d] = value.split("-").map(Number);
  const date = utc(y, m, d);
  if (iso(date) !== value) throw new RangeError(`없는 날짜입니다: ${value}`);
  return date;
}

/** 주어진 날짜(서울 달력)에 표시할 절기 배너 */
export function selectSeason(value: string, options: SeasonOptions = {}): SeasonSelection {
  const date = parseDate(value);
  const y = date.getUTCFullYear();

  if (options.thanksgiving) {
    const t = thanksgivingSunday(y);
    if (date >= addDays(t, -14) && date < addDays(t, 1)) {
      return {
        key: "thanksgiving",
        start: iso(addDays(t, -14)),
        end: iso(addDays(t, 1)),
        reason: "교회 고유 일정: 11월 셋째 일요일, 14일 전부터 표시",
      };
    }
  }

  const range = calendar(y).find((r) => value >= r.start && value < r.end)!;
  // 성탄 기간은 연도를 넘어 12/25 ~ 다음 해 1/6로 표시
  let { start, end } = range;
  if (range.key === "christmas") {
    if (start.endsWith("-01-01")) start = `${y - 1}-12-25`;
    if (end === `${y + 1}-01-01`) end = `${y + 1}-01-06`;
  }
  return { key: range.key, start, end, reason: "서방 교회력 기반 기본 배너 일정" };
}

/** 서버 시각을 서울 달력 날짜로 변환. 방문자 기기 시간대와 무관 */
export function seoulToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** 'YYYY-MM-DD' 서울 자정을 Date로 */
export function seoulMidnight(value: string): Date {
  return new Date(`${value}T00:00:00+09:00`);
}

export function currentSeason(now: Date = new Date(), options: SeasonOptions = {}) {
  const selection = selectSeason(seoulToday(now), options);
  return { ...selection, nextChangeAt: seoulMidnight(selection.end).toISOString() };
}
