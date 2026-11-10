-- 보안 보강

-- 1) 초대받은 계정만 관리자 프로필을 만든다.
-- 대시보드에서 공개 가입을 끄지 않았거나 다시 켜도, 공개 키로 직접 가입한 계정은
-- 프로필이 없어 is_staff()가 false다. (초대·대시보드 Invite user는 invited_at이 채워진다)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.invited_at is null then
    return new;
  end if;
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end $$;

-- 2) 비로그인(프로필 없음)일 때 my_role()이 NULL이라 is_super_admin()도 NULL이 되어
-- plpgsql의 `if not public.is_super_admin()` 검사를 그냥 지나쳤다(쓰기 자체는 RLS가 막음).
-- 항상 true/false를 돌려주게 한다. RLS 정책에서는 NULL과 false가 같으므로 동작 변화 없음.
create or replace function public.is_super_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(public.my_role() = 'super_admin', false)
$$;
