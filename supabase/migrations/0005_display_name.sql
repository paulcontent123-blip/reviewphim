-- T11: tên hiển thị (Q8). Hỏi ở lần đăng bài đầu, cho tiếng Việt, không trùng, đặt một lần.

alter table profiles add column display_name text;

-- Dạng NFC và không còn dấu rời (chặn chữ chồng dấu); bỏ dấu rồi chỉ còn a-z, số, một khoảng trắng giữa các từ,
-- nên chữ của bảng chữ cái khác giả dạng Latin cũng bị từ chối.
alter table profiles add constraint profiles_display_name_format check (
  display_name is null or (
    display_name = normalize(display_name, nfc)
    and display_name !~ '[̀-ͯ]'
    and char_length(display_name) between 2 and 30
    and public.vn_unaccent(display_name) ~ '^[a-z0-9]+( [a-z0-9]+)*$'
  )
);
create unique index profiles_display_name_key on profiles (lower(display_name));

-- Quy tắc chỉ áp cho người dùng gọi qua API; service_role và SQL Editor đổi được.
create function public.profiles_guard_name() returns trigger
language plpgsql set search_path = '' as $$
declare
  plain text := replace(public.vn_unaccent(new.display_name), ' ', '');
begin
  if current_user <> 'authenticated' or new.display_name is not distinct from old.display_name then
    return new;
  end if;
  if old.display_name is not null then
    raise exception 'display_name_locked' using errcode = 'check_violation';
  end if;
  if not public.can_post_content() then
    raise exception 'display_name_off' using errcode = 'check_violation';
  end if;
  -- Cụm tiếng Việt so khớp cả dấu, để không chặn tên thật như "Quân Trí".
  if new.role <> 'admin' and (
    plain like 'admin%' or plain like 'reviewphim%' or plain = 'moderator'
    or lower(new.display_name) in ('quản trị', 'quản trị viên', 'ban quản trị')
  ) then
    raise exception 'display_name_reserved' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger profiles_guard_name before update on profiles
  for each row execute function public.profiles_guard_name();

-- Đăng hoặc sửa nội dung bài phải có tên. Chỉ chấm điểm thì không cần (câu lệnh không đụng title, content).
create function public.reviews_require_name() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not exists (
    select 1 from public.profiles p where p.id = new.author_id and p.display_name is not null
  ) then
    -- Người khác author_id thì để RLS từ chối như cũ.
    if new.author_id = (select auth.uid()) then
      raise exception 'review_needs_display_name' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

create trigger reviews_require_name before insert or update of title, content on reviews
  for each row when (new.content is not null) execute function public.reviews_require_name();

-- Người dùng đặt display_name, không còn tự đổi username (trước đây đặt được tên như "admin").
revoke update (username) on profiles from authenticated;
grant select (display_name) on profiles to anon, authenticated;
grant update (display_name) on profiles to authenticated;

create or replace view review_feed with (security_invoker = true) as
select r.id, r.slug, r.title, r.content, r.score, r.spoiler, r.tags, r.likes, r.published_at,
       r.film_id, f.slug as film_slug, f.title as film_title, f.poster_url as film_poster_url,
       f.genres as film_genres, f.year as film_year,
       coalesce(p.display_name, p.username) as author_name, p.avatar_url as author_avatar_url, p.role as author_role
  from reviews r
  join films f on f.id = r.film_id
  join profiles p on p.id = r.author_id
 where r.status = 'published' and r.content is not null;
