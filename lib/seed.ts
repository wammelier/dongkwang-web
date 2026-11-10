// 예시 데이터 — 최종 시안의 문구를 옮긴 것이며 실제 교회 정보가 아니다.
// [대괄호] 항목은 교회 확인 후 관리자 페이지에서 입력한다 (기획서 13장: 임의의 사실로 채우지 않음).
import type { Bulletin, ChurchInfo, Community, Faq, Post, Sermon, WorshipTime } from "./types";

export const churchInfo: ChurchInfo = {
  name: "동광교회",
  nameEn: "DONG GWANG CHURCH",
  denomination: "대한예수교장로회",
  address: "[교회 주소]",
  phone: "[대표 전화]",
  officeHours: "[운영 시간]",
  mapUrl: null,
  parking: { headline: "교회 앞 주차 가능", detail: "[주차장 입구·이용 범위]" },
  transit: "[가까운 버스 정류장·지하철역과 걸어서 오는 길]",
  accessibility: "[계단·엘리베이터·경사로 등 이동 편의 정보]",
  channels: [
    { label: "유튜브", href: null },
    { label: "인스타그램", href: null },
    { label: "카카오톡 채널", href: null },
  ],
  intro:
    "동광교회는 말씀을 함께 배우고, 서로 마주보고 기대어 사랑하며, 받은 사랑을 동네와 이웃에게 나누는 교회입니다. [교회 소개문]",
  values: [
    { title: "배움", body: "말씀을 함께 읽고 배우며 삶의 기준을 세웁니다." },
    { title: "사랑", body: "서로 마주보고 기대어, 한 가족처럼 돌봅니다." },
    { title: "나눔", body: "받은 사랑을 동네와 이웃에게 흘려보냅니다." },
  ],
  pastorGreeting: { name: "[담임목사]", body: "[담임목사 인사말]" },
  staff: [
    { role: "담임목사", name: "[이름]" },
    { role: "교육 담당", name: "[이름]" },
  ],
  history: [{ year: "[연도]", text: "[주요 연혁]" }],
  welcomeSteps: [
    {
      title: "예배 15분 전에 오세요",
      body: "입구에서 안내위원이 맞이하고 예배실로 함께 갑니다. [권장 도착 시간·입구 위치]",
    },
    {
      title: "자녀와 함께 오셔도 괜찮습니다",
      body: "아이 소리가 나도 괜찮은 예배입니다. 연령별 모임도 준비되어 있습니다. [자녀 동반 안내]",
    },
    {
      title: "예배 후 차 한 잔 나눠요",
      body: "친교실에서 교회를 소개해 드립니다. 궁금한 점은 [대표 연락처]로 편히 연락 주세요.",
    },
  ],
  visitSteps: [
    { title: "도착", body: "[권장 도착 시간]. [입구와 안내 데스크 위치]" },
    { title: "안내", body: "안내위원이 자리와 자녀 예배실을 안내해 드립니다." },
    { title: "예배", body: "순서는 화면과 주보에 안내됩니다. 따라 하지 않으셔도 괜찮습니다." },
    { title: "교제", body: "예배 후 친교실에서 차를 나누며 교회를 소개해 드립니다." },
  ],
};

export const worshipTimes: WorshipTime[] = [
  {
    id: "w1",
    name: "주일예배",
    target: "전 교인",
    weekday: "주일",
    startTime: "오전 11:00",
    place: "본당",
    isOnline: false,
    isMain: true,
    isActive: true,
  },
  {
    id: "w2",
    name: "[예배명]",
    target: "[대상]",
    weekday: "[요일]",
    startTime: "[시간]",
    place: "[장소]",
    isOnline: false,
    isMain: false,
    isActive: true,
  },
];

export const communities: Community[] = [
  {
    id: "infant",
    name: "영유아부",
    target: "영유아와 부모",
    ageRange: "0–5세",
    meetTime: "주일 11:00",
    place: "[장소]",
    activities: "[주요 활동]",
    howToJoin: "주일 예배 전 안내위원에게 말씀해 주세요.",
    isActive: true,
  },
  {
    id: "kids",
    name: "어린이부",
    target: "초등학생",
    ageRange: "초등",
    meetTime: "주일 11:00",
    place: "[장소]",
    activities: "[주요 활동]",
    howToJoin: "주일 예배 전 안내위원에게 말씀해 주세요.",
    isActive: true,
  },
  {
    id: "youth",
    name: "청소년부",
    target: "중·고등학생",
    ageRange: "중·고등",
    meetTime: "[모임 시간]",
    place: "[장소]",
    activities: "[주요 활동]",
    howToJoin: "[처음 참여하는 방법]",
    isActive: true,
  },
  {
    id: "young",
    name: "청년부",
    target: "청년",
    ageRange: "20–30대",
    meetTime: "[모임 시간]",
    place: "[장소]",
    activities: "[주요 활동]",
    howToJoin: "[처음 참여하는 방법]",
    isActive: true,
  },
  {
    id: "adult",
    name: "장년부",
    target: "장년",
    ageRange: "구역·소그룹",
    meetTime: "[모임 시간]",
    place: "[장소]",
    activities: "[주요 활동]",
    howToJoin: "[처음 참여하는 방법]",
    isActive: true,
  },
];

export const sermons: Sermon[] = [
  {
    id: "2026-11-01",
    title: "서로 사랑하라",
    scripture: "요한일서 4:7–12",
    preacher: "[설교자]",
    preachedOn: "2026-11-01",
    videoUrl: null,
    summary:
      "사랑은 하나님께 속한 것이니, 서로 사랑하는 사람은 하나님을 압니다. 우리의 사랑이 어디서 시작되는지 돌아봅니다.",
    status: "published",
  },
];

export const bulletins: Bulletin[] = [
  {
    id: "2026-11-01",
    date: "2026-11-01",
    title: "11월 첫째 주 주보",
    filePath: null,
    note: "예배 순서, 광고, 이번 주 기도 제목을 PDF로 확인할 수 있습니다.",
    status: "published",
  },
];

export const posts: Post[] = [
  {
    id: "notice-worship-time",
    type: "notice",
    title: "11월 예배 시간 변경 안내",
    summary: "11월 셋째 주부터 예배 시간이 조정됩니다. 변경 내용을 꼭 확인해 주세요.",
    body: "11월 셋째 주부터 예배 시간이 조정됩니다.\n\n[변경 전·후 예배 시간과 적용 날짜]\n\n궁금한 점은 교회 사무실로 연락 주세요.",
    status: "published",
    isPinned: true,
    publishedAt: "2026-11-02",
  },
  {
    id: "event-bible-study",
    type: "event",
    title: "가을 성경공부 · 요한일서",
    summary: "6주 과정, 주일 오후 2시. 처음 참여하시는 분도 환영합니다. [신청 방법]",
    body: "요한일서를 6주 동안 함께 읽습니다. 처음 참여하시는 분도 환영합니다.\n\n[신청 방법]",
    status: "published",
    isPinned: false,
    publishedAt: "2026-11-01",
    eventStart: "2026-11-08T14:00:00+09:00",
    eventEnd: "2026-12-13T16:00:00+09:00",
    eventPlace: "[장소]",
    eventTarget: "누구나",
  },
  {
    id: "draft-example",
    type: "notice",
    title: "임시 저장 예시 — 공개되지 않아야 함",
    summary: "",
    body: "",
    status: "draft",
    isPinned: false,
    publishedAt: "2026-11-03",
  },
];

export const faqs: Faq[] = [
  { id: "f1", question: "등록을 꼭 해야 하나요?", answer: "[교회 방침 확인 후 입력]", isActive: true },
  { id: "f2", question: "어떤 옷을 입고 가야 하나요?", answer: "[교회 방침 확인 후 입력]", isActive: true },
  { id: "f3", question: "헌금은 어떻게 하나요?", answer: "[교회 방침 확인 후 입력]", isActive: true },
  { id: "f4", question: "아이와 함께 가도 되나요?", answer: "[자녀 동반 안내]", isActive: true },
];
