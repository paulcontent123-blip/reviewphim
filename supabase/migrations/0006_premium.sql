-- T19 (Q2): giới hạn đọc review theo gói, bật tắt được. Mặc định tắt: ai cũng đọc đầy đủ như trước.
-- Đổi trong SQL Editor, có hiệu lực ngay (trang tĩnh cập nhật sau khoảng 5 phút):
--   update site_settings set premium_enabled = true, guest_free_reviews = 1, member_free_reviews = 3;
--   update profiles set premium_until = now() + interval '30 days' where username = '...';

alter table site_settings
  add column premium_enabled boolean not null default false,
  -- Số bài đăng sớm nhất của mỗi phim được đọc đầy đủ.
  add column guest_free_reviews int not null default 1 check (guest_free_reviews >= 0),
  add column member_free_reviews int not null default 1 check (member_free_reviews >= 0);

-- Không cấp quyền đọc, ghi cho anon và authenticated: chỉ quản trị cấp Premium.
alter table profiles add column premium_until timestamptz;

-- View cần biết bài có nội dung hay không mà không được đọc cột content.
alter table reviews add column has_content boolean generated always as (content is not null) stored;
create index reviews_film_order_idx on reviews (film_id, published_at, id) where status = 'published' and content is not null;

-- Người đang gọi có được đọc đầy đủ bài này không.
create function public.can_read_review(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reviews r
     where r.id = target
       and (r.status = 'published' or r.author_id = (select auth.uid()))
       and (
         -- Thiếu dòng cấu hình thì coi như Premium đang tắt.
         not coalesce((select s.premium_enabled from public.site_settings s), false)
         or r.author_id = (select auth.uid())
         or exists (select 1 from public.profiles p
                     where p.id = (select auth.uid()) and (p.role = 'admin' or p.premium_until > now()))
         or (select count(*) from public.reviews o
              where o.film_id = r.film_id and o.status = 'published' and o.content is not null
                and (o.published_at, o.id) < (r.published_at, r.id))
            < (select case when (select auth.uid()) is null then s.guest_free_reviews else s.member_free_reviews end
                 from public.site_settings s)
       )
  )
$$;

-- Nội dung theo quyền: đầy đủ, hoặc 200 ký tự đầu; bài có tiết lộ nội dung thì không trích.
create function public.review_body(target uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
           when public.can_read_review(r.id) then r.content
           when r.spoiler then ''
           else left(r.content, 200)
         end
    from public.reviews r
   where r.id = target and (r.status = 'published' or r.author_id = (select auth.uid()))
$$;

-- Tác giả lấy bài của mình để sửa, vì không còn đọc thẳng được cột content.
create function public.my_review(film uuid)
returns table (score numeric, title text, content text, spoiler boolean, tags text[], status text)
language sql stable security definer set search_path = '' as $$
  select r.score, r.title, r.content, r.spoiler, r.tags, r.status
    from public.reviews r
   where r.film_id = film and r.author_id = (select auth.uid())
$$;

revoke execute on function public.can_read_review(uuid), public.review_body(uuid), public.my_review(uuid) from public, anon, authenticated;
grant execute on function public.can_read_review(uuid), public.review_body(uuid) to anon, authenticated, service_role;
grant execute on function public.my_review(uuid) to authenticated, service_role;

create or replace view review_feed with (security_invoker = true) as
select r.id, r.slug, r.title, public.review_body(r.id) as content, r.score, r.spoiler, r.tags, r.likes, r.published_at,
       r.film_id, f.slug as film_slug, f.title as film_title, f.poster_url as film_poster_url,
       f.genres as film_genres, f.year as film_year,
       coalesce(p.display_name, p.username) as author_name, p.avatar_url as author_avatar_url, p.role as author_role,
       not public.can_read_review(r.id) as locked
  from reviews r
  join films f on f.id = r.film_id
  join profiles p on p.id = r.author_id
 where r.status = 'published' and r.has_content;

-- Bỏ quyền đọc cả bảng, cấp lại mọi cột trừ content. Cột thêm sau này phải được cấp riêng.
revoke select on reviews from anon, authenticated;
grant select (id, film_id, author_id, title, score, spoiler, tags, likes, published_at, slug, status, has_content)
  on reviews to anon, authenticated;
