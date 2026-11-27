-- T21: trang quản trị tối thiểu: admin nhập link xem và ẩn, hiện bài review. Quyền ép ở database.
-- Đặt một người làm admin trong SQL Editor:
--   update profiles set role = 'admin' where display_name = '...';

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
$$;
revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------- Link xem

alter table watch_options
  add constraint watch_options_label_len check (label is null or char_length(label) <= 60),
  add constraint watch_options_url_len check (char_length(url) <= 2000);

-- Không cấp sửa film_id: muốn chuyển phim thì xóa rồi thêm lại.
grant insert (film_id, platform, url, type, quality, label), update (platform, url, type, quality, label), delete
  on watch_options to authenticated;
create policy "admin insert" on watch_options for insert to authenticated with check ((select public.is_admin()));
create policy "admin update" on watch_options for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete" on watch_options for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------- Kiểm duyệt review
-- Dùng hàm thay vì cấp quyền cột: quyền cột áp cho mọi người đăng nhập, tác giả sẽ tự hiện lại được bài bị ẩn.

create function public.admin_reviews(only_status text, page_size int default 20, page_offset int default 0)
returns table (
  id uuid, slug text, title text, content text, score numeric, spoiler boolean, status text, published_at timestamptz,
  film_slug text, film_title text, author_name text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  return query
    select r.id, r.slug, r.title, r.content, r.score, r.spoiler, r.status, r.published_at,
           f.slug, f.title, coalesce(p.display_name, p.username)
      from public.reviews r
      join public.films f on f.id = r.film_id
      join public.profiles p on p.id = r.author_id
     where r.content is not null and r.status = only_status
     order by r.published_at desc, r.id
     limit least(greatest(page_size, 1), 100) offset greatest(page_offset, 0);
end $$;

create function public.set_review_status(target uuid, new_status text)
returns table (review_slug text, film_slug text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin_only' using errcode = '42501';
  end if;
  return query
    update public.reviews r set status = new_status
      from public.films f
     where r.id = target and f.id = r.film_id
    returning r.slug, f.slug;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
end $$;

revoke execute on function public.admin_reviews(text, int, int), public.set_review_status(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_reviews(text, int, int), public.set_review_status(uuid, text) to authenticated, service_role;
