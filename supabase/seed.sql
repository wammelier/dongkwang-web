-- 예시 데이터 — 실제 교회 정보 아님. [대괄호] 항목은 확인 후 관리자 페이지에서 입력한다.
-- lib/seed.ts(Supabase 미설정 시 대체 데이터)와 같은 내용을 유지한다.

insert into public.church_info (
  id, name, name_en, denomination, address, phone, office_hours, map_url,
  parking_headline, parking_detail, transit, accessibility, channels, intro, "values",
  pastor_name, pastor_greeting, staff, history, welcome_steps, visit_steps
) values (
  1, '동광교회', 'DONG GWANG CHURCH', '대한예수교장로회', '[교회 주소]', '[대표 전화]', '[운영 시간]', null,
  '교회 앞 주차 가능', '[주차장 입구·이용 범위]',
  '[가까운 버스 정류장·지하철역과 걸어서 오는 길]', '[계단·엘리베이터·경사로 등 이동 편의 정보]',
  '[{"label":"유튜브","href":null},{"label":"인스타그램","href":null},{"label":"카카오톡 채널","href":null}]',
  '동광교회는 말씀을 함께 배우고, 서로 마주보고 기대어 사랑하며, 받은 사랑을 동네와 이웃에게 나누는 교회입니다. [교회 소개문]',
  '[{"title":"배움","body":"말씀을 함께 읽고 배우며 삶의 기준을 세웁니다."},
    {"title":"사랑","body":"서로 마주보고 기대어, 한 가족처럼 돌봅니다."},
    {"title":"나눔","body":"받은 사랑을 동네와 이웃에게 흘려보냅니다."}]',
  '[담임목사]', '[담임목사 인사말]',
  '[{"role":"담임목사","name":"[이름]"},{"role":"교육 담당","name":"[이름]"}]',
  '[{"year":"[연도]","text":"[주요 연혁]"}]',
  '[{"title":"예배 15분 전에 오세요","body":"입구에서 안내위원이 맞이하고 예배실로 함께 갑니다. [권장 도착 시간·입구 위치]"},
    {"title":"자녀와 함께 오셔도 괜찮습니다","body":"아이 소리가 나도 괜찮은 예배입니다. 연령별 모임도 준비되어 있습니다. [자녀 동반 안내]"},
    {"title":"예배 후 차 한 잔 나눠요","body":"친교실에서 교회를 소개해 드립니다. 궁금한 점은 [대표 연락처]로 편히 연락 주세요."}]',
  '[{"title":"도착","body":"[권장 도착 시간]. [입구와 안내 데스크 위치]"},
    {"title":"안내","body":"안내위원이 자리와 자녀 예배실을 안내해 드립니다."},
    {"title":"예배","body":"순서는 화면과 주보에 안내됩니다. 따라 하지 않으셔도 괜찮습니다."},
    {"title":"교제","body":"예배 후 친교실에서 차를 나누며 교회를 소개해 드립니다."}]'
);

insert into public.worship_times (name, target, weekday, start_time, place, is_main, sort) values
  ('주일예배', '전 교인', 0, '11:00', '본당', true, 1);

insert into public.communities (slug, name, target, age_range, meet_time, place, activities, how_to_join, sort) values
  ('infant', '영유아부', '영유아와 부모', '0–5세', '주일 11:00', '[장소]', '[주요 활동]', '주일 예배 전 안내위원에게 말씀해 주세요.', 1),
  ('kids', '어린이부', '초등학생', '초등', '주일 11:00', '[장소]', '[주요 활동]', '주일 예배 전 안내위원에게 말씀해 주세요.', 2),
  ('youth', '청소년부', '중·고등학생', '중·고등', '[모임 시간]', '[장소]', '[주요 활동]', '[처음 참여하는 방법]', 3),
  ('young', '청년부', '청년', '20–30대', '[모임 시간]', '[장소]', '[주요 활동]', '[처음 참여하는 방법]', 4),
  ('adult', '장년부', '장년', '구역·소그룹', '[모임 시간]', '[장소]', '[주요 활동]', '[처음 참여하는 방법]', 5);

insert into public.faqs (question, answer, sort) values
  ('등록을 꼭 해야 하나요?', '[교회 방침 확인 후 입력]', 1),
  ('어떤 옷을 입고 가야 하나요?', '[교회 방침 확인 후 입력]', 2),
  ('헌금은 어떻게 하나요?', '[교회 방침 확인 후 입력]', 3),
  ('아이와 함께 가도 되나요?', '[자녀 동반 안내]', 4);

insert into public.sermons (title, scripture, preacher, preached_on, summary, status) values
  ('서로 사랑하라', '요한일서 4:7–12', '[설교자]', '2026-11-01',
   '사랑은 하나님께 속한 것이니, 서로 사랑하는 사람은 하나님을 압니다. 우리의 사랑이 어디서 시작되는지 돌아봅니다.', 'published');

insert into public.bulletins (date, title, note, status) values
  ('2026-11-01', '11월 첫째 주 주보', '예배 순서, 광고, 이번 주 기도 제목을 PDF로 확인할 수 있습니다.', 'published');

insert into public.posts (type, title, summary, body, status, is_pinned, published_at) values
  ('notice', '11월 예배 시간 변경 안내',
   '11월 셋째 주부터 예배 시간이 조정됩니다. 변경 내용을 꼭 확인해 주세요.',
   E'11월 셋째 주부터 예배 시간이 조정됩니다.\n\n[변경 전·후 예배 시간과 적용 날짜]\n\n궁금한 점은 교회 사무실로 연락 주세요.',
   'published', true, '2026-11-02 09:00+09'),
  ('notice', '임시 저장 예시 — 공개되지 않아야 함', '', '', 'draft', false, null);

insert into public.posts (type, title, summary, body, status, published_at, event_start, event_end, event_place, event_target) values
  ('event', '가을 성경공부 · 요한일서',
   '6주 과정, 주일 오후 2시. 처음 참여하시는 분도 환영합니다. [신청 방법]',
   E'요한일서를 6주 동안 함께 읽습니다. 처음 참여하시는 분도 환영합니다.\n\n[신청 방법]',
   'published', '2026-11-01 09:00+09', '2026-11-08 14:00+09', '2026-12-13 16:00+09', '[장소]', '누구나');

-- 메인 구역 기본값(켜짐·순서)은 마이그레이션 20261104000200에서 만든다.

-- 절기 배너 문구 (lib/banners.ts와 동일).
-- 절기는 기본이 '적용 안 함'(draft)이라 연중 배너를 그대로 유지한다. 관리자가 절기마다 '적용'을 켜면 published가 된다.
-- 연중은 늘 적용되는 기본 배너라 published.
insert into public.main_banners (season, title, description, status) values
  ('advent', E'소망으로\n기다리는 시간', '오실 주님을 기다리며, 우리의 마음에 소망의 빛을 밝힙니다.', 'draft'),
  ('christmas', E'우리 가운데\n오신 예수님', '가장 낮은 곳으로 오신 사랑을 함께 기뻐합니다.', 'draft'),
  ('epiphany', E'빛으로 오신\n주님을 따라', '우리를 비추는 그 빛을 따라 믿음의 길을 걷습니다.', 'draft'),
  ('lent', E'주님의\n걸음을 따라', '기도와 묵상으로 주님의 사랑을 깊이 새깁니다.', 'draft'),
  ('palm-sunday', E'호산나,\n주님을 맞이합니다', '기쁨과 찬양으로 우리에게 오시는 주님을 맞이합니다.', 'draft'),
  ('holy-week', E'우리를 위해\n내어주신 사랑', '섬김과 나눔으로 주님의 사랑을 기억합니다.', 'draft'),
  ('easter', E'다시 사신 주님,\n새로운 소망', '부활의 기쁨으로 오늘을 새롭게 살아갑니다.', 'draft'),
  ('pentecost', E'성령 안에서\n함께 세워집니다', '서로를 세우며 사랑을 실천하는 공동체가 됩니다.', 'draft'),
  ('ordinary', E'사랑과 나눔을\n배우고 실천합니다', '예수님의 사랑을 배우고 이웃과 함께 나눕니다.', 'published'),
  ('thanksgiving', E'받은 은혜를 감사로,\n이웃에게', '한 해의 은혜를 기억하고 감사의 열매를 함께 나눕니다.', 'draft');
