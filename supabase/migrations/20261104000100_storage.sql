-- 파일 저장소 (계획서 5.3, 11장)
-- 읽기는 공개 버킷 URL로, 쓰기는 활성 관리자만. 경로는 <테이블>/<id>/<uuid>.<ext>.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('bulletins', 'bulletins', true, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('images', 'images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('banners', 'banners', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "storage: staff read" on storage.objects for select to authenticated
  using (bucket_id in ('bulletins', 'images', 'banners') and public.is_staff());

create policy "storage: staff upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('bulletins', 'images', 'banners') and public.is_staff());

create policy "storage: staff update" on storage.objects for update to authenticated
  using (bucket_id in ('bulletins', 'images', 'banners') and public.is_staff());

create policy "storage: staff delete" on storage.objects for delete to authenticated
  using (bucket_id in ('bulletins', 'images', 'banners') and public.is_staff());
