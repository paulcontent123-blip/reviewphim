-- Phần spec mô tả nhưng mục 5 chưa có bảng/cột, và RLS (mục 4 yêu cầu).

-- ---------------------------------------------------------------- Hàm dùng chung

-- Bỏ dấu tiếng Việt để tìm kiếm ("bo gia" khớp "Bố Già").
create function public.vn_unaccent(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(replace(replace(
    regexp_replace(normalize(coalesce(t, ''), NFD), '[̀-ͯ]', '', 'g'),
    'đ', 'd'), 'Đ', 'D'))
$$;

-- ---------------------------------------------------------------- Films

alter table films
  add column tmdb_id int,                                        -- khóa đồng bộ TMDB
  add column tmdb_type text check (tmdb_type in ('movie','tv')),
  add column locked_fields text[] not null default '{}',         -- cột đã sửa tay, sync không ghi đè
  add column search_text text not null default '',
  add constraint films_tmdb_key unique (tmdb_type, tmdb_id),
  add constraint films_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  alter column vote_count set not null;

create function public.films_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search_text := public.vn_unaccent(new.title || ' ' || coalesce(new.original_title, ''));
  new.updated_at := now();
  return new;
end $$;

create trigger films_before_write before insert or update on films
  for each row execute function public.films_before_write();

create index films_status_idx on films (status);
create index films_year_idx on films (year);
create index films_genres_idx on films using gin (genres);

-- Actor (mục 3: Film.cast; mục 8: ActorChip)
create table film_cast (
  film_id uuid not null references films(id) on delete cascade,
  position int not null,
  name text not null,
  role text,
  avatar_url text,
  primary key (film_id, position)
);

-- ---------------------------------------------------------------- Watch options

alter table watch_options
  alter column film_id set not null,
  add constraint watch_options_url_https check (url ~ '^https://'),
  add constraint watch_options_platform check (platform in ('vieon','fptplay','netflix','galaxyplay','cgv','other')),
  add constraint watch_options_type check (type in ('subscription','rent','buy','free')),
  add constraint watch_options_quality check (quality in ('4K','FHD','HD'));
create index watch_options_film_idx on watch_options (film_id);

-- ---------------------------------------------------------------- Profiles (mục 3: User)
-- email nằm ở auth.users, watchlist nằm ở bảng watchlist.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-zA-Z0-9_]{3,30}$'),
  role text not null default 'viewer' check (role in ('viewer','reviewer','partner','admin')),
  avatar_url text check (avatar_url ~ '^https://'),
  affiliate_code text unique,
  total_commission numeric(12,0) not null default 0,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 24))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

insert into profiles (id, username)
select id, 'user_' || substr(replace(id::text, '-', ''), 1, 24) from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------- Reviews
-- Dòng có content là bài review; content null là chấm điểm nhanh. Mỗi người một dòng mỗi phim.

alter table reviews
  alter column film_id set not null,
  alter column author_id set not null,
  alter column score set not null,
  alter column likes set not null,
  alter column spoiler set not null,
  alter column published_at set not null,
  add column slug text unique,
  add column status text not null default 'published' check (status in ('published','hidden')),
  add constraint reviews_one_per_user unique (film_id, author_id),
  add constraint reviews_score_range check (score between 1 and 10),
  add constraint reviews_content_len check (content is null or char_length(content) between 50 and 20000),
  add constraint reviews_title_len check (title is null or char_length(title) between 5 and 150),
  add constraint reviews_title_with_content check (content is null or title is not null),
  drop constraint reviews_author_id_fkey,
  add constraint reviews_author_id_fkey foreign key (author_id) references auth.users(id) on delete cascade;

create index reviews_published_idx on reviews (published_at desc) where status = 'published';
create index reviews_author_idx on reviews (author_id);

create function public.reviews_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.content is not null and new.slug is null then
    select f.slug || '-' || substr(replace(new.id::text, '-', ''), 1, 8)
      into new.slug from public.films f where f.id = new.film_id;
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger reviews_before_write before insert or update on reviews
  for each row execute function public.reviews_before_write();

-- site_score và vote_count luôn tính từ reviews, không nhập tay.
create function public.refresh_film_score() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target uuid := case when tg_op = 'DELETE' then old.film_id else new.film_id end;
begin
  update public.films f
     set site_score = s.avg_score, vote_count = s.total
    from (select round(avg(r.score), 1) as avg_score, count(*)::int as total
            from public.reviews r
           where r.film_id = target and r.status = 'published') s
   where f.id = target;
  return null;
end $$;

create trigger reviews_refresh_score
  after insert or delete or update of score, status on reviews
  for each row execute function public.refresh_film_score();

-- Like: mỗi người một lần mỗi bài.
create table review_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id uuid not null references reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);
create index review_likes_review_idx on review_likes (review_id);

create function public.refresh_review_likes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target uuid := case when tg_op = 'DELETE' then old.review_id else new.review_id end;
begin
  update public.reviews r
     set likes = (select count(*) from public.review_likes l where l.review_id = target)
   where r.id = target;
  return null;
end $$;

create trigger review_likes_refresh after insert or delete on review_likes
  for each row execute function public.refresh_review_likes();

-- Danh sách bài review kèm phim và tác giả.
create view review_feed with (security_invoker = true) as
select r.id, r.slug, r.title, r.content, r.score, r.spoiler, r.tags, r.likes, r.published_at,
       r.film_id, f.slug as film_slug, f.title as film_title, f.poster_url as film_poster_url,
       f.genres as film_genres, f.year as film_year,
       p.username as author_name, p.avatar_url as author_avatar_url, p.role as author_role
  from reviews r
  join films f on f.id = r.film_id
  join profiles p on p.id = r.author_id
 where r.status = 'published' and r.content is not null;

-- ---------------------------------------------------------------- Xóa tài khoản

alter table watchlist
  drop constraint watchlist_user_id_fkey,
  add constraint watchlist_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table affiliate_clicks
  drop constraint affiliate_clicks_user_id_fkey,
  add constraint affiliate_clicks_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
create index affiliate_clicks_film_idx on affiliate_clicks (film_id, clicked_at desc);

-- ---------------------------------------------------------------- RLS và quyền

alter table films enable row level security;
alter table film_cast enable row level security;
alter table watch_options enable row level security;
alter table profiles enable row level security;
alter table reviews enable row level security;
alter table review_likes enable row level security;
alter table showtimes enable row level security;
alter table watchlist enable row level security;
alter table affiliate_clicks enable row level security;

revoke all on films, film_cast, watch_options, profiles, reviews, review_likes,
              showtimes, watchlist, affiliate_clicks, review_feed
  from anon, authenticated;
grant all on films, film_cast, watch_options, profiles, reviews, review_likes,
             showtimes, watchlist, affiliate_clicks
  to service_role;
grant select on review_feed to service_role;

-- Nội dung công khai: ai cũng đọc, chỉ service_role ghi.
grant select on films, film_cast, watch_options, showtimes, review_feed to anon, authenticated;
create policy "public read" on films for select to anon, authenticated using (true);
create policy "public read" on film_cast for select to anon, authenticated using (true);
create policy "public read" on watch_options for select to anon, authenticated using (true);
create policy "public read" on showtimes for select to anon, authenticated using (true);

-- Hồ sơ: ẩn affiliate_code và total_commission; không tự đổi được role.
grant select (id, username, role, avatar_url, created_at) on profiles to anon, authenticated;
grant update (username, avatar_url) on profiles to authenticated;
create policy "public read" on profiles for select to anon, authenticated using (true);
create policy "own update" on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Review: cột likes, status, slug, published_at do hệ thống quản lý.
grant select on reviews to anon, authenticated;
grant insert (film_id, author_id, title, content, score, spoiler, tags) on reviews to authenticated;
grant update (title, content, score, spoiler, tags) on reviews to authenticated;
grant delete on reviews to authenticated;
create policy "read published or own" on reviews for select to anon, authenticated
  using (status = 'published' or author_id = (select auth.uid()));
create policy "own insert" on reviews for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "own update" on reviews for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "own delete" on reviews for delete to authenticated
  using (author_id = (select auth.uid()));

grant select, delete on review_likes to authenticated;
grant insert (user_id, review_id) on review_likes to authenticated;
create policy "own read" on review_likes for select to authenticated using (user_id = (select auth.uid()));
create policy "own insert" on review_likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own delete" on review_likes for delete to authenticated using (user_id = (select auth.uid()));

grant select, delete on watchlist to authenticated;
grant insert (user_id, film_id) on watchlist to authenticated;
create policy "own read" on watchlist for select to authenticated using (user_id = (select auth.uid()));
create policy "own insert" on watchlist for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own delete" on watchlist for delete to authenticated using (user_id = (select auth.uid()));

-- affiliate_clicks: không có policy, chỉ service_role (route /go) đọc và ghi.
