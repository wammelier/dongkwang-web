-- 4단계: 주보·설교·교회 정보 관리자 화면과 글 첨부파일

-- ───────────────────────── 글 첨부파일 저장소
-- 공지 첨부(신청서·안내문 등). 한글 문서는 브라우저마다 형식 이름이 달라 알려진 이름을 모두 둔다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('attachments', 'attachments', true, 20971520, array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp',
    'application/vnd.hancom.hwpx', 'application/hwp+zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ])
on conflict (id) do nothing;

drop policy "storage: staff read" on storage.objects;
drop policy "storage: staff upload" on storage.objects;
drop policy "storage: staff update" on storage.objects;
drop policy "storage: staff delete" on storage.objects;

create policy "storage: staff read" on storage.objects for select to authenticated
  using (bucket_id in ('bulletins', 'images', 'banners', 'attachments') and public.is_staff());
create policy "storage: staff upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('bulletins', 'images', 'banners', 'attachments') and public.is_staff());
create policy "storage: staff update" on storage.objects for update to authenticated
  using (bucket_id in ('bulletins', 'images', 'banners', 'attachments') and public.is_staff());
create policy "storage: staff delete" on storage.objects for delete to authenticated
  using (bucket_id in ('bulletins', 'images', 'banners', 'attachments') and public.is_staff());

-- 사람이 나온 사진은 공개 동의를 확인한 것만 공개 (계획서 11장). 관리자는 전부 본다.
drop policy "post_files: read with post" on public.post_files;
create policy "post_files: read with post" on public.post_files for select to anon, authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id)
    and (kind = 'attachment' or has_consent or public.is_staff())
  );

-- ───────────────────────── 목록 한 번에 저장 (최고 관리자)
-- 화면의 목록 전체를 받아 없어진 행은 지우고, 있는 행은 고치고, 새 행은 만든다. 한 트랜잭션이라 실패하면 전부 취소.

create function public.save_worship_times(items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_super_admin() then
    raise exception '최고 관리자만 예배 시간을 바꿀 수 있습니다.' using errcode = '42501';
  end if;
  if (select count(*) from jsonb_array_elements(items) e where (e ->> 'is_main')::boolean) > 1 then
    raise exception '대표 예배는 하나만 정할 수 있습니다.' using errcode = '22023';
  end if;

  delete from public.worship_times
  where id not in (select (e ->> 'id')::uuid from jsonb_array_elements(items) e where e ->> 'id' is not null);
  -- 대표 예배를 옮길 때 잠깐 두 개가 되지 않도록 먼저 모두 내린다 (worship_times_main_key)
  update public.worship_times set is_main = false where is_main;

  insert into public.worship_times (id, name, target, weekday, start_time, place, is_online, is_main, sort, is_active)
  select coalesce(r.id, gen_random_uuid()), r.name, r.target, r.weekday, r.start_time, r.place, r.is_online, r.is_main, r.sort, r.is_active
  from jsonb_populate_recordset(null::public.worship_times, items) r
  on conflict (id) do update set
    name = excluded.name, target = excluded.target, weekday = excluded.weekday, start_time = excluded.start_time,
    place = excluded.place, is_online = excluded.is_online, is_main = excluded.is_main, sort = excluded.sort,
    is_active = excluded.is_active;
end $$;

create function public.save_communities(items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_super_admin() then
    raise exception '최고 관리자만 공동체를 바꿀 수 있습니다.' using errcode = '42501';
  end if;

  delete from public.communities
  where id not in (select (e ->> 'id')::uuid from jsonb_array_elements(items) e where e ->> 'id' is not null);

  -- slug(공개 페이지 주소의 #이름)는 처음 만들 때 정하고 바꾸지 않는다
  insert into public.communities (id, slug, name, target, age_range, meet_time, place, activities, how_to_join, contact, sort, is_active)
  select coalesce(r.id, gen_random_uuid()), coalesce(r.slug, 'group-' || substr(md5(random()::text), 1, 8)),
         r.name, r.target, r.age_range, r.meet_time, r.place, r.activities, r.how_to_join, r.contact, r.sort, r.is_active
  from jsonb_populate_recordset(null::public.communities, items) r
  on conflict (id) do update set
    name = excluded.name, target = excluded.target, age_range = excluded.age_range, meet_time = excluded.meet_time,
    place = excluded.place, activities = excluded.activities, how_to_join = excluded.how_to_join,
    contact = excluded.contact, sort = excluded.sort, is_active = excluded.is_active;
end $$;

create function public.save_faqs(items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_super_admin() then
    raise exception '최고 관리자만 FAQ를 바꿀 수 있습니다.' using errcode = '42501';
  end if;

  delete from public.faqs
  where id not in (select (e ->> 'id')::uuid from jsonb_array_elements(items) e where e ->> 'id' is not null);

  insert into public.faqs (id, question, answer, sort, is_active)
  select coalesce(r.id, gen_random_uuid()), r.question, r.answer, r.sort, r.is_active
  from jsonb_populate_recordset(null::public.faqs, items) r
  on conflict (id) do update set
    question = excluded.question, answer = excluded.answer, sort = excluded.sort, is_active = excluded.is_active;
end $$;
