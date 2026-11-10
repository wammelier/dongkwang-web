-- 동광교회 홈페이지 초기 스키마 (개발 계획서 5장)
-- 공개 페이지: anon 키 + RLS로 '게시 상태이고 노출 기간 안인 행'만 읽는다.
-- 쓰기: editor = 콘텐츠(공지·행사·이야기·주보·설교·절기 배너), super_admin = 전부.

-- ───────────────────────── 타입
create type public.app_role as enum ('super_admin', 'editor');
create type public.content_status as enum ('draft', 'published', 'unpublished', 'trashed');
create type public.post_type as enum ('notice', 'event', 'story');

-- ───────────────────────── 관리자 프로필
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  name text not null default '',
  role public.app_role not null default 'editor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- auth.users 생성(초대) 시 프로필 자동 생성. 역할은 항상 editor로 시작하고 최고 관리자가 바꾼다.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 현재 로그인 사용자의 역할 (비활성 계정은 null → 즉시 차단)
create function public.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create function public.is_staff() returns boolean
language sql stable set search_path = '' as $$
  select public.my_role() is not null
$$;

create function public.is_super_admin() returns boolean
language sql stable set search_path = '' as $$
  select public.my_role() = 'super_admin'
$$;

-- 활성 최고 관리자가 0명이 되는 변경은 막는다
create function public.keep_one_super_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'super_admin' and old.is_active
     and (new.role <> 'super_admin' or not new.is_active)
     and not exists (
       select 1 from public.profiles
       where id <> old.id and role = 'super_admin' and is_active
     ) then
    raise exception '활성 최고 관리자가 최소 1명은 있어야 합니다.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger profiles_keep_one_super_admin
  before update on public.profiles
  for each row execute function public.keep_one_super_admin();

-- ───────────────────────── 공통 트리거
create function public.set_updated() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;

-- 게시 시각은 처음 게시될 때 한 번 기록, 휴지통 이동·복구 시 deleted_at 관리
create function public.set_status_times() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'trashed' and new.deleted_at is null then
    new.deleted_at := now();
  elsif new.status <> 'trashed' then
    new.deleted_at := null;
  end if;
  return new;
end $$;

create function public.in_window(s timestamptz, e timestamptz) returns boolean
language sql stable set search_path = '' as $$
  select (s is null or s <= now()) and (e is null or e >= now())
$$;

-- ───────────────────────── 콘텐츠
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  type public.post_type not null,
  title text not null check (length(btrim(title)) > 0),
  summary text not null default '',
  body text not null default '',
  status public.content_status not null default 'draft',
  is_pinned boolean not null default false,
  publish_start timestamptz,
  publish_end timestamptz,
  event_start timestamptz,
  event_end timestamptz,
  event_place text,
  event_target text,
  apply_url text,
  published_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint posts_publish_window check (publish_start is null or publish_end is null or publish_end > publish_start),
  constraint posts_event_window check (event_start is null or event_end is null or event_end >= event_start),
  constraint posts_event_only check (type = 'event' or (event_start is null and event_end is null))
);
create index posts_public_idx on public.posts (status, type, published_at desc);

create table public.post_files (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  kind text not null check (kind in ('image', 'attachment')),
  path text not null,
  name text not null,
  size bigint not null default 0,
  sort integer not null default 0,
  -- 사람이 나온 사진은 공개 동의 확인 후 게시 (계획서 11장)
  has_consent boolean not null default false,
  created_at timestamptz not null default now()
);
create index post_files_post_idx on public.post_files (post_id, sort);

create table public.bulletins (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null check (length(btrim(title)) > 0),
  file_path text,
  note text not null default '',
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- 주보 1건 = 날짜 1개 (휴지통 제외)
create unique index bulletins_date_key on public.bulletins (date) where status <> 'trashed';

create table public.sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  scripture text not null default '',
  preacher text not null default '',
  preached_on date not null,
  video_url text,
  summary text not null default '',
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index sermons_public_idx on public.sermons (status, preached_on desc);

-- 절기 배너 문구 (이미지 없이 문구만 쓰는 현재 시안 기준, image_path는 선택)
create table public.main_banners (
  id uuid primary key default gen_random_uuid(),
  season text not null check (season in (
    'advent', 'christmas', 'epiphany', 'lent', 'palm-sunday', 'holy-week',
    'easter', 'pentecost', 'ordinary', 'thanksgiving', 'special'
  )),
  kind text not null default 'season' check (kind in ('season', 'special')),
  title text not null check (length(btrim(title)) > 0),
  eyebrow text,
  description text not null default '',
  image_path text,
  primary_label text,
  primary_href text,
  publish_start timestamptz,
  publish_end timestamptz,
  sort integer not null default 0,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- 특별 배너는 종료일 필수 (기획서 15.4)
  constraint main_banners_special_end check (kind <> 'special' or publish_end is not null),
  constraint main_banners_window check (publish_start is null or publish_end is null or publish_end > publish_start)
);
-- 절기마다 게시된 기본 배너는 하나
create unique index main_banners_season_key on public.main_banners (season)
  where kind = 'season' and status = 'published';

-- ───────────────────────── 교회 정보 (최고 관리자)
create table public.church_info (
  id smallint primary key default 1 check (id = 1),
  name text not null,
  name_en text not null default '',
  denomination text not null default '',
  address text not null default '',
  phone text not null default '',
  office_hours text not null default '',
  map_url text,
  parking_headline text not null default '',
  parking_detail text not null default '',
  transit text not null default '',
  accessibility text not null default '',
  channels jsonb not null default '[]',
  intro text not null default '',
  "values" jsonb not null default '[]',
  pastor_name text not null default '',
  pastor_greeting text not null default '',
  staff jsonb not null default '[]',
  history jsonb not null default '[]',
  welcome_steps jsonb not null default '[]',
  visit_steps jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create table public.worship_times (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target text not null default '',
  weekday smallint not null check (weekday between 0 and 6), -- 0 = 주일
  start_time time not null,
  place text not null default '',
  is_online boolean not null default false,
  is_main boolean not null default false,
  sort integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
create unique index worship_times_main_key on public.worship_times (is_main) where is_main;

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  target text not null default '',
  age_range text not null default '',
  meet_time text not null default '',
  place text not null default '',
  activities text not null default '',
  how_to_join text not null default '',
  contact text not null default '',
  sort integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create table public.main_sections (
  key text primary key check (key in ('welcome', 'about', 'sermon', 'news', 'community')),
  is_visible boolean not null default true,
  headline text not null default '',
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null default '',
  sort integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- ───────────────────────── 수정 기록
create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text,
  action text not null,
  actor_id uuid,
  at timestamptz not null default now(),
  diff jsonb
);
create index audit_logs_row_idx on public.audit_logs (table_name, row_id, at desc);

create function public.write_audit_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  d jsonb;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(key, jsonb_build_object('old', o -> key, 'new', value)) into d
    from jsonb_each(n)
    where (o -> key) is distinct from value and key not in ('updated_at', 'updated_by');
    if d is null then return new; end if;
  else
    d := coalesce(n, o);
  end if;
  insert into public.audit_logs (table_name, row_id, action, actor_id, diff)
  values (tg_table_name, coalesce(n ->> 'id', o ->> 'id', n ->> 'key', o ->> 'key'), lower(tg_op), auth.uid(), d);
  return coalesce(new, old);
end $$;

-- ───────────────────────── 트리거 연결
do $$
declare t text;
begin
  foreach t in array array['profiles', 'posts', 'bulletins', 'sermons', 'main_banners', 'church_info',
                           'worship_times', 'communities', 'main_sections', 'faqs'] loop
    execute format('create trigger %I_set_updated before update on public.%I for each row execute function public.set_updated()', t, t);
  end loop;
  foreach t in array array['posts', 'bulletins', 'sermons', 'main_banners'] loop
    execute format('create trigger %I_status_times before insert or update on public.%I for each row execute function public.set_status_times()', t, t);
  end loop;
  foreach t in array array['profiles', 'posts', 'bulletins', 'sermons', 'main_banners', 'church_info',
                           'worship_times', 'communities', 'main_sections', 'faqs'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t, t);
  end loop;
end $$;

-- ───────────────────────── 공개용 뷰 (security_invoker: 호출자 RLS가 그대로 적용)
-- 로그인한 관리자가 공개 페이지를 봐도 임시 저장 글이 섞이지 않도록 조건을 한 번 더 건다.
create view public.published_posts with (security_invoker = true) as
  select * from public.posts
  where status = 'published' and public.in_window(publish_start, publish_end);

create view public.published_bulletins with (security_invoker = true) as
  select * from public.bulletins where status = 'published';

create view public.published_sermons with (security_invoker = true) as
  select * from public.sermons where status = 'published';

create view public.active_main_banners with (security_invoker = true) as
  select * from public.main_banners
  where status = 'published' and public.in_window(publish_start, publish_end);

-- ───────────────────────── RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_files enable row level security;
alter table public.bulletins enable row level security;
alter table public.sermons enable row level security;
alter table public.main_banners enable row level security;
alter table public.church_info enable row level security;
alter table public.worship_times enable row level security;
alter table public.communities enable row level security;
alter table public.main_sections enable row level security;
alter table public.faqs enable row level security;
alter table public.audit_logs enable row level security;

-- 프로필: 본인과 관리자끼리 조회, 수정은 최고 관리자만 (생성은 트리거)
create policy "profiles: staff read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy "profiles: super admin update" on public.profiles for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- 콘텐츠: 공개는 게시본만, 관리자는 전부 조회·작성·수정, 완전 삭제는 최고 관리자가 휴지통에서만
create policy "posts: public read" on public.posts for select to anon, authenticated
  using (status = 'published' and public.in_window(publish_start, publish_end));
create policy "bulletins: public read" on public.bulletins for select to anon, authenticated
  using (status = 'published');
create policy "sermons: public read" on public.sermons for select to anon, authenticated
  using (status = 'published');
create policy "main_banners: public read" on public.main_banners for select to anon, authenticated
  using (status = 'published' and public.in_window(publish_start, publish_end));

do $$
declare t text;
begin
  foreach t in array array['posts', 'bulletins', 'sermons', 'main_banners'] loop
    execute format('create policy "%s: staff read" on public.%I for select to authenticated using (public.is_staff())', t, t);
    execute format('create policy "%s: staff insert" on public.%I for insert to authenticated with check (public.is_staff())', t, t);
    execute format('create policy "%s: staff update" on public.%I for update to authenticated using (public.is_staff()) with check (public.is_staff())', t, t);
    execute format('create policy "%s: super admin purge" on public.%I for delete to authenticated using (public.is_super_admin() and status = ''trashed'')', t, t);
  end loop;
end $$;

-- 첨부: 부모 글을 볼 수 있으면 보이고(posts RLS가 적용됨), 관리자가 관리
create policy "post_files: read with post" on public.post_files for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "post_files: staff write" on public.post_files for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- 교회 정보류: 공개 읽기(활성만), 쓰기는 최고 관리자
create policy "church_info: public read" on public.church_info for select to anon, authenticated using (true);
create policy "church_info: super admin write" on public.church_info for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "main_sections: public read" on public.main_sections for select to anon, authenticated using (true);
create policy "main_sections: super admin write" on public.main_sections for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

do $$
declare t text;
begin
  foreach t in array array['worship_times', 'communities', 'faqs'] loop
    execute format('create policy "%s: public read" on public.%I for select to anon, authenticated using (is_active or public.is_staff())', t, t);
    execute format('create policy "%s: super admin write" on public.%I for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin())', t, t);
  end loop;
end $$;

create policy "audit_logs: super admin read" on public.audit_logs for select to authenticated
  using (public.is_super_admin());

-- 비로그인 사용자는 관리자 정보·수정 기록 테이블에 아예 접근하지 못한다
revoke all on public.profiles, public.audit_logs from anon;
