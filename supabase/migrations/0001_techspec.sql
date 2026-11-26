-- Schema nguyên văn theo reviewphim-techspec.pdf, mục 5.
-- Phải chạy cùng 0002_phase1.sql: file đó bật RLS. Không chạy riêng file này trên môi trường thật.

-- Films
create table films (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  original_title text,
  poster_url text,
  backdrop_url text,
  genres text[],
  year int,
  country text,
  imdb_score numeric(3,1),
  site_score numeric(3,1),
  vote_count int default 0,
  director text,
  synopsis text,
  trailer_url text,
  status text check (status in ('now_showing','coming_soon','streaming')),
  total_episodes int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Watch options (affiliate)
create table watch_options (
  id uuid primary key default gen_random_uuid(),
  film_id uuid references films(id) on delete cascade,
  platform text not null,
  url text not null,
  type text,
  quality text,
  label text
);

-- Reviews
create table reviews (
  id uuid primary key default gen_random_uuid(),
  film_id uuid references films(id),
  author_id uuid references auth.users(id),
  title text,
  content text,
  score numeric(3,1),
  spoiler boolean default false,
  tags text[],
  likes int default 0,
  published_at timestamptz default now()
);

-- Showtimes
create table showtimes (
  id uuid primary key default gen_random_uuid(),
  film_id uuid references films(id),
  cinema_chain text,
  cinema_name text,
  city text,
  format text,
  show_time timestamptz,
  booking_url text,
  synced_at timestamptz default now()
);

-- User watchlist
create table watchlist (
  user_id uuid references auth.users(id),
  film_id uuid references films(id),
  added_at timestamptz default now(),
  primary key (user_id, film_id)
);

-- Affiliate click tracking
create table affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  film_id uuid references films(id),
  platform text,
  clicked_at timestamptz default now()
);
