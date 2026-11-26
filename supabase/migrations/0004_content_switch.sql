-- T03: công tắc tắt nội dung người dùng (UC-12, UC-13, UC-15), dùng khi chưa có kết luận pháp lý.
-- Đổi trong SQL Editor, có hiệu lực ngay:
--   update site_settings set ugc_enabled = false;  -- tắt
--   update site_settings set ugc_enabled = true;   -- bật

-- Bảng một dòng. RLS bật và không có policy: chỉ service_role và SQL Editor đọc, ghi.
create table site_settings (
  id boolean primary key default true check (id),
  ugc_enabled boolean not null default true
);
insert into site_settings default values;
alter table site_settings enable row level security;
revoke all on site_settings from anon, authenticated;
grant all on site_settings to service_role;

-- security definer để hỏi được cờ mà không cần quyền đọc bảng.
-- Thiếu dòng cờ thì coi như tắt. Admin luôn được đăng để viết bài biên tập.
create function public.can_post_content() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.ugc_enabled from public.site_settings s), false)
      or exists (select 1 from public.profiles p
                  where p.id = (select auth.uid()) and p.role = 'admin')
$$;
revoke execute on function public.can_post_content() from public;
grant execute on function public.can_post_content() to anon, authenticated, service_role;

-- Chỉ chặn thêm và sửa. Xóa vẫn được vì chỉ làm giảm nội dung.
drop policy "own insert" on reviews;
create policy "own insert" on reviews for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.can_post_content()));

-- Điều kiện công tắc nằm ở with check để database báo lỗi thay vì lặng lẽ sửa 0 dòng.
drop policy "own update" on reviews;
create policy "own update" on reviews for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and (select public.can_post_content()));

drop policy "own insert" on review_likes;
create policy "own insert" on review_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.can_post_content()));
