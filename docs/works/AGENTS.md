# AGENTS.md: quy tắc làm việc và plan cho agent

Dự án **reviewphim.vn**: web review phim tiếng Việt, có link affiliate sang nền tảng xem phim và đặt vé. Một người phát triển. Đọc hết phần 1–5 trước khi sửa code. Mọi đường dẫn và lệnh trong file tính từ thư mục gốc dự án.

## 1. Nguồn yêu cầu

Khi các nguồn mâu thuẫn, theo thứ tự từ trên xuống:

1. Câu trả lời đã chốt của người yêu cầu (ghi ở mục 8).
2. Tech spec: `docs/reviewphim-techspec.pdf`.
3. Tài liệu use case (mã UC-01–UC-41, Q1–Q27): https://claude.ai/artifact/GdPLe8wFD44LzvYQ82jWuQ
4. Demo `docs/reviewphim-v4.html`: chỉ tham khảo giao diện. Chức năng chỉ có trong demo **không** thuộc phạm vi.

Không mở được link ở mục 3 thì dùng mã UC và mô tả trong file này, thiếu thông tin thì hỏi.

## 2. Hiện trạng (kiểm tra ngày 26/11/2026)

- `npm run lint`, `npm run typecheck`, `npm test` (33 test), `npm run build` đều đạt ở chế độ dữ liệu mẫu.
- Chưa chạy với Supabase và TMDB thật. Chưa triển khai.
- Git đã khởi tạo (nhánh `main`, remote `origin`: https://github.com/paulcontent123-blip/reviewphim.git).
- `npm audit --omit=dev` báo 1 lỗ hổng critical và 1 high, bản vá yêu cầu nâng Next.js (đang ở 14.2.35).
- Phase 1 đã có: trang chủ, trang phim, thể loại, năm, tìm kiếm, đọc/viết/sửa review, chấm điểm, "Hữu ích", đăng nhập email và Google, `/go` ghi lượt click, đồng bộ TMDB, sitemap, JSON-LD.

## 3. Lệnh và cấu trúc

| Việc | Lệnh |
| --- | --- |
| Cài đặt | `npm ci` |
| Chạy local (127.0.0.1) | `npm run dev` |
| Kiểm tra bắt buộc | `npm run lint && npm run typecheck && npm test && npm run build` |

CI (`.github/workflows/ci.yml`) chạy đúng bốn lệnh kiểm tra trên Node 22.

| Đường dẫn | Nội dung |
| --- | --- |
| `src/app/` | Route (App Router); `actions.ts` chứa server action; `go/[id]` là chuyển hướng affiliate |
| `src/components/` | Component giao diện |
| `src/lib/data/` | Nơi duy nhất trang đọc dữ liệu; `sample.ts` là dữ liệu mẫu |
| `src/lib/supabase/` | 4 client: `public`, `browser`, `server` (theo phiên), `service` (bỏ qua RLS) |
| `src/lib/tmdb*.ts` | Đồng bộ TMDB |
| `supabase/migrations/` | Schema, RLS, trigger |
| `tests/` | Vitest; `database.test.ts` chạy migration thật trên PGlite |

Biến môi trường xem `.env.example`. Thiếu cấu hình Supabase thì web chạy dữ liệu mẫu; riêng production trên Vercel sẽ báo lỗi.

## 4. Quy tắc bắt buộc

### 4.1 Phạm vi

- Chỉ làm task có trong plan hoặc được người dùng giao. Không thêm tính năng "tiện thể".
- Không làm phát phim, upload video, gói trả phí, app mobile, quảng cáo khi chưa có quyết định ở mục 8.
- Task ghi **Chờ Qx** thì không làm. Cột "Đề xuất" trong tài liệu không phải là quyết định.
- Giữ 4 giá trị `role` hiện có trong database cho tới khi chốt vai trò.
- Spec, demo, code lệch nhau: nêu điểm lệch và hỏi, không tự chọn.

### 4.2 Database

- Thay đổi schema bằng file mới `supabase/migrations/NNNN_ten.sql`. Không sửa `0001`, `0002`.
- Thêm tên migration mới vào danh sách trong `beforeAll` của `tests/database.test.ts` (đang liệt kê cứng).
- Mọi bảng `public` bật RLS; `revoke` rồi `grant` đúng cột cần thiết; có test cho quyền được phép và bị cấm.
- Người dùng đã đăng nhập gọi thẳng được API Supabase bằng anon key. Vì vậy **mọi quy tắc nghiệp vụ và quyền phải ép ở database** (constraint, policy, trigger). Kiểm tra ở server action hay giao diện chỉ để báo lỗi cho đẹp.
- `site_score`, `vote_count`, `likes`, `status`, `slug`, `published_at` do hệ thống quản lý, không cấp quyền ghi cho người dùng.

### 4.3 Bảo mật

- Không commit, in log hay dán vào chat giá trị khóa bí mật. Không tạo file `.env*` nào được commit ngoài `.env.example`.
- `serviceClient()` chỉ dùng ở route handler phía server. Không import vào component client.
- Nội dung người dùng chỉ hiển thị qua component `Markdown` (không HTML thô, không ảnh ngoài).
- Tham số quay lại sau đăng nhập đi qua `safeNext`. Link ra ngoài phải là `https`.
- Link affiliate dùng thẻ `<a>` thường trỏ tới `/go/[id]` (không dùng `Link`, tránh prefetch làm sai số click), có `rel="sponsored nofollow noopener"`.

### 4.4 Next.js, giao diện, SEO

- Trang công khai đọc bằng `publicClient()` qua `src/lib/data`, không đọc cookie, để giữ ISR.
- Thêm truy vấn mới thì thêm bản tương ứng cho dữ liệu mẫu.
- Sửa dữ liệu thì gọi `revalidatePath` cho các trang bị ảnh hưởng.
- Chữ trên giao diện là tiếng Việt. Thiết kế từ 360px, vùng bấm tối thiểu 44px, dùng token màu trong `tailwind.config.ts`.
- Trang công khai mới có title, description, canonical và được thêm vào `sitemap.ts`. Trang riêng tư đặt `noindex`.
- Giữ `images.unoptimized` khi còn ở Next 14 (lý do ghi trong `next.config.mjs`).

### 4.5 Viết code

- TypeScript `strict`; không dùng `any` hay tắt luật lint để qua kiểm tra.
- Theo phong cách file lân cận. Comment tiếng Việt, giải thích lý do.
- Dependency mới phải được người dùng đồng ý và ghim phiên bản chính xác.

### 4.6 Phải hỏi trước khi làm

`git commit` / `push`, deploy, chạy migration hoặc xóa dữ liệu trên database thật, nâng phiên bản lớn, cài dependency, tạo tài khoản dịch vụ, gửi dữ liệu ra dịch vụ ngoài.

## 5. Quy trình cho mỗi task

1. Đọc task, UC liên quan và file sẽ sửa. Nêu ngắn cách làm nếu đụng database, quyền hoặc hơn 3 file.
2. Viết test trước cho quy tắc database và hàm trong `src/lib`.
3. Sửa đúng phạm vi task.
4. Chạy bốn lệnh kiểm tra. Task có giao diện thì mở trang bằng trình duyệt ở 360px và desktop.
5. Cập nhật trạng thái ở mục 6.
6. Báo cáo: đã đổi gì, kết quả lệnh, phần chưa kiểm tra được, việc người dùng phải làm.

**Hoàn thành** khi: đạt hết "Xong khi" của task, bốn lệnh đạt, có test cho hành vi mới. Không chạy được bước nào thì ghi rõ, không đánh dấu hoàn thành.

Dừng và hỏi khi: yêu cầu mơ hồ, cần quyết định ở mục 8, cần khóa hoặc tài khoản chưa có, hoặc test cũ phải sửa kỳ vọng mới qua được.

## 6. Plan Phase 1 (26/11/2026 – 25/01/2027)

Làm theo thứ tự trong bảng, bỏ qua task đang bị chặn.

| Mã | Task | Trạng thái |
| --- | --- | --- |
| T01 | Khởi tạo git | Đã `git init`, chờ duyệt để commit và push |
| T02 | Vá lỗ hổng moderation và ràng buộc review | Sẵn sàng |
| T03 | Công tắc tắt nội dung người dùng | Sẵn sàng |
| T04 | Báo cho tác giả khi bài bị ẩn | Sẵn sàng |
| T05 | Nâng Next.js | Cần đồng ý |
| T06 | Nối Supabase thật và staging | Cần người dùng cấp khóa |
| T07 | Đồng bộ TMDB thật | Cần khóa TMDB, sau T06 |
| T08 | E2E Playwright | Cần đồng ý, sau T06 |
| T09 | Sentry, GA4, Vercel Analytics | Cần đồng ý và khóa |
| T10 | Trang chính sách, điều khoản | Cần người dùng duyệt nội dung |
| T11 | Tên hiển thị | Chờ Q8 |
| T12 | Quên mật khẩu (UC-11) | Chờ Q9 |
| T13 | Tự xóa review và điểm (UC-14) | Chờ Q10, sau T02 |
| T14 | Chặn tự bấm "Hữu ích" | Chờ Q11 |
| T15 | Ngưỡng vào Top 10 | Chờ Q12 |
| T16 | Thêm rạp Lotte, Galaxy Cinema, BHD | Chờ Q14 |
| T17 | Nghiệm thu và ra mắt | Sau các task trên |

### T01 · Khởi tạo git
- Việc: `git init`; kiểm tra `.gitignore` loại `.env*`, `node_modules`, `.next`; liệt kê file sẽ commit.
- Xong khi: người dùng duyệt danh sách và commit đầu tiên không chứa bí mật.

### T02 · Vá lỗ hổng moderation và ràng buộc review (UC-13, UC-18)
- Vấn đề 1: policy `own delete` cho phép tác giả xóa bài đang bị ẩn rồi đăng lại thành bài mới.
- Vấn đề 2: giới hạn 5 tag, mỗi tag 30 ký tự chỉ có ở `submitReview`; gọi thẳng API thì vượt được.
- Việc: migration mới chỉ cho xóa bài `published`; thêm constraint cho `tags`.
- Điểm số: database cho phép số lẻ. Chỉ ép số nguyên sau khi chốt Q6.
- Xong khi: test chứng minh bài ẩn không xóa được và dữ liệu tag sai bị từ chối.

### T03 · Công tắc tắt nội dung người dùng (UC-12, UC-13, UC-15)
- Lý do: cổng ra mắt cần tắt được nếu chưa có kết luận pháp lý (Q4).
- Việc: lưu cờ trong database; policy `insert`/`update` của `reviews` và `insert` của `review_likes` kiểm tra cờ; chỉ `service_role` đổi cờ. Giao diện ẩn form và nút, server action trả thông báo rõ.
- Xong khi: tắt cờ thì gọi thẳng database cũng bị từ chối, đọc review vẫn bình thường; bật lại hoạt động như cũ.
- Giá trị khi ra mắt do người dùng quyết.

### T04 · Báo cho tác giả khi bài bị ẩn (UC-18)
- Việc: ở trang viết review, tác giả có bài `hidden` thấy thông báo; lưu không chuyển sang trang 404.
- Xong khi: sửa bài ẩn hiển thị trạng thái, bài vẫn ẩn.

### T05 · Nâng Next.js
- Việc: đọc hướng dẫn nâng cấp chính thức, đề xuất phiên bản đích và danh sách thay đổi trước khi sửa. Chú ý từ Next 15 `cookies()`, `params`, `searchParams` là bất đồng bộ; Next 16 bỏ `next lint` và đổi quy ước middleware.
- Xong khi: bốn lệnh đạt, `npm audit --omit=dev` không còn critical/high từ Next, các route ở mục 2 hoạt động.

### T06 · Nối Supabase thật và staging (UC-08–10, 12, 13, 15)
- Người dùng: tạo project (region Singapore), cấu hình Google OAuth, đặt biến môi trường trên Vercel.
- Agent: hướng dẫn từng bước, chạy migration theo thứ tự sau khi được đồng ý.
- Xong khi trên staging: đăng ký email, đăng nhập Google, chấm điểm, đăng và sửa review, "Hữu ích", click affiliate ghi vào `affiliate_clicks`.

### T07 · Đồng bộ TMDB thật (UC-16, UC-17)
- Việc: gọi `/api/cron/tmdb-sync?pages=1` (tối đa 5) với header `Authorization: Bearer $CRON_SECRET`; xem `failed`.
- Xong khi: chạy hai lần không trùng phim; cột trong `locked_fields` không bị ghi đè; cron trên Vercel chạy được.
- Không đưa dữ liệu TMDB lên production khi chưa có thỏa thuận thương mại.

### T08 · E2E Playwright
- Xong khi: test luồng đăng nhập, viết review, click affiliate chạy trên staging và trong CI.

### T09 · Giám sát và đo lường
- Việc: Sentry; Vercel Analytics; sự kiện GA4 cho click affiliate, đăng ký, chấm điểm, viết review. Không gửi email hay thông tin định danh vào sự kiện.
- Xong khi: lỗi thử xuất hiện trên Sentry, sự kiện xuất hiện trên GA4.

### T10 · Chính sách và điều khoản
- Việc: tạo trang, link ở footer, ô đồng ý khi đăng ký. Văn bản pháp lý do người dùng cung cấp hoặc duyệt.

### T11–T16 · Sau khi có câu trả lời
Làm theo đúng câu trả lời, không theo đề xuất cũ.

| Mã | Chỗ sửa chính | Xong khi |
| --- | --- | --- |
| T11 | Form tên hiển thị; database đã cho sửa `username` | Review hiện tên đã đặt; tên trùng báo lỗi |
| T12 | `LoginForm`, trang đặt mật khẩu mới, `auth/callback` | Đặt lại được qua email thật |
| T13 | `actions.ts`, trang viết review | Xóa xong điểm phim tính lại |
| T14 | Migration policy `review_likes` | Test: tự like bị database từ chối |
| T15 | `listFilms` (`sort: "score"`) và dữ liệu mẫu | Phim dưới ngưỡng không vào Top 10 |
| T16 | Migration constraint, `types.ts`, `platforms.ts` | Nút "Đặt vé" đúng cho từng rạp |

### T17 · Cổng ra mắt MVP
- [ ] Người yêu cầu đã chốt Q1, Q2, Q3
- [ ] Thỏa thuận thương mại bằng văn bản với TMDB
- [ ] Kết luận pháp lý về nội dung người dùng; chưa rõ thì tắt bằng T03
- [ ] Next.js ở phiên bản còn được vá
- [ ] Gói Vercel cho phép thương mại; Supabase có sao lưu
- [ ] Công khai hoa hồng affiliate; ghi nguồn TMDB kèm logo
- [ ] LCP dưới 2,5 giây trên mobile; JSON-LD hợp lệ
- [ ] 15–20 bài review đầu tiên đã đăng (số lượng là đề xuất)

## 7. Phase 2 và 3: chưa được code

Trước mỗi nhóm, viết đặc tả (luồng, bảng, quyền, tiêu chí nghiệm thu) và chờ duyệt.

| Thời gian | Nhóm | UC | Bị chặn bởi |
| --- | --- | --- | --- |
| 26/01–25/03/2027 | Watchlist, hồ sơ | 21, 22 | Q23 |
| | Lịch chiếu | 19, 20 | Q18 |
| | Chương trình reviewer | 23–27 | Q3, Q19–Q22 |
| | Tin tức | 28, 29 | Q17, pháp lý |
| 26/03–25/05/2027 | Admin (làm trước cộng đồng) | 36–40 | Q5 |
| | Cộng đồng, báo cáo vi phạm | 30–32 | Q26, pháp lý |
| | Cổng đối tác | 34, 35 | Q25 |
| | Watch party, thông báo đẩy | 33, 41 | Q1, Q24, Q27 |

## 8. Quyết định

Chưa có câu nào được người yêu cầu chốt. Khi có, ghi vào bảng này (ngày, câu trả lời), rồi cập nhật trạng thái ở mục 6 và 7.

| Mã | Câu hỏi | Quyết định |
| --- | --- | --- |
| Q1 | Có tự phát phim, upload video không | |
| Q2 | Chia gói Free / Premium để đọc review không | |
| Q3 | Reviewer miễn phí hay mua gói VIP | |
| Vai trò | 4 vai trò theo spec hay chỉ User và Admin; đối tác chỉ gửi form hay có tài khoản | |
| Q4 | Pháp lý chưa xong thì có tắt nội dung người dùng không | |
| Q6 | Điểm người dùng chỉ là số nguyên không | |
| Q8–Q12, Q14 | Tên hiển thị, quên mật khẩu, tự xóa, tự like, Top 10, rạp | |
