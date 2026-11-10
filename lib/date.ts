// 모든 표시는 Asia/Seoul 기준
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parts(value: string) {
  const d = value.length === 10 ? new Date(`${value}T00:00:00+09:00`) : new Date(value);
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(d);
  const get = (type: string) => f.find((p) => p.type === type)?.value ?? "";
  const dow = new Date(Date.UTC(+get("year"), +get("month") - 1, +get("day"))).getUTCDay();
  return { y: get("year"), m: String(+get("month")), d: String(+get("day")), h: +get("hour"), min: get("minute"), dow };
}

const dayName = (dow: number) => (dow === 0 ? "주일" : `${WEEKDAYS[dow]}요일`);

/** 2026.11.02 */
export function formatDot(value: string) {
  const { y, m, d } = parts(value);
  return `${y}.${m.padStart(2, "0")}.${d.padStart(2, "0")}`;
}

/** 2026년 11월 1일 (주일) */
export function formatLong(value: string) {
  const { y, m, d, dow } = parts(value);
  return `${y}년 ${m}월 ${d}일 (${dayName(dow)})`;
}

/** 11월 8일 (주일) */
export function formatMonthDay(value: string) {
  const { m, d, dow } = parts(value);
  return `${m}월 ${d}일 (${dayName(dow)})`;
}

/** 오후 2:00 */
export function formatTime(value: string) {
  const { h, min } = parts(value);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${min}`;
}

/** 같은 날 끝나면 종료 시각만, 다른 날이면 날짜와 시각을 함께 */
export function eventRange(start: string, end?: string) {
  const from = `${formatMonthDay(start)} ${formatTime(start)}`;
  if (!end) return from;
  const sameDay = formatDot(start) === formatDot(end);
  return `${from} ~ ${sameDay ? formatTime(end) : `${formatMonthDay(end)} ${formatTime(end)}`}`;
}
