-- 메인 구역 순서 (관리자 '메인 구역'에서 켜기·끄기와 순서 변경)
-- 절기 배너와 예배·방문 정보는 기획서 4장에 따라 맨 위 고정이라 여기서 다루지 않는다.

alter table public.main_sections add column sort integer not null default 0;

insert into public.main_sections (key, is_visible, sort) values
  ('welcome', true, 1),
  ('about', true, 2),
  ('sermon', true, 3),
  ('news', true, 4),
  ('community', true, 5)
on conflict (key) do update set sort = excluded.sort;

-- 여러 구역의 순서를 한 번에(한 트랜잭션으로) 저장. 권한은 호출자 RLS(최고 관리자)로 확인된다.
create function public.save_main_sections(items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  item jsonb;
  n integer;
begin
  if not public.is_super_admin() then
    raise exception '최고 관리자만 메인 구역을 바꿀 수 있습니다.' using errcode = '42501';
  end if;
  if jsonb_typeof(items) <> 'array' then
    raise exception '잘못된 형식입니다.' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(items) loop
    update public.main_sections
      set is_visible = (item ->> 'is_visible')::boolean,
          sort = (item ->> 'sort')::integer
      where key = item ->> 'key';
    get diagnostics n = row_count;
    if n = 0 then
      raise exception '없는 구역입니다: %', item ->> 'key' using errcode = '22023';
    end if;
  end loop;
end $$;
