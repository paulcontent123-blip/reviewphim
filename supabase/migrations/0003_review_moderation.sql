-- T02: bịt hai đường vượt quy tắc khi người dùng gọi thẳng API Supabase (UC-13, UC-18).

-- Bài đang bị ẩn không được xóa. Nếu xóa được, tác giả đăng lại là thành bài mới ở trạng thái published.
drop policy "own delete" on reviews;
create policy "own delete" on reviews for delete to authenticated
  using (author_id = (select auth.uid()) and status = 'published');

-- Giới hạn tag như submitReview: tối đa 5 tag, mỗi tag 1–30 ký tự, không toàn khoảng trắng.
-- Phải viết thành hàm vì check constraint không nhận truy vấn con.
create function public.valid_review_tags(tags text[]) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select case
    when tags is null or cardinality(tags) = 0 then true
    when array_ndims(tags) <> 1 or cardinality(tags) > 5 then false
    else not exists (
      select 1 from unnest(tags) as t(tag)
       where t.tag is null or t.tag !~ '\S' or char_length(t.tag) > 30
    )
  end
$$;

alter table reviews
  add constraint reviews_tags_valid check (public.valid_review_tags(tags));

-- Độ dài tối thiểu tính sau khi cắt khoảng trắng hai đầu, như submitReview.
-- btrim mặc định chỉ cắt dấu cách nên phải liệt kê cả tab, xuống dòng, form feed và tab dọc (\x0B).
alter table reviews
  add constraint reviews_title_trimmed_len
    check (title is null or char_length(btrim(title, E' \t\n\r\f\x0B')) >= 5),
  add constraint reviews_content_trimmed_len
    check (content is null or char_length(btrim(content, E' \t\n\r\f\x0B')) >= 50);
