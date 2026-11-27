import { expect, test, type Page } from "@playwright/test";
import { rows, testData } from "./data";

async function signIn(page: Page, next: string) {
  const { email, password } = testData();
  await page.goto(`/dang-nhap?next=${encodeURIComponent(next)}`);
  // Nút trên thanh đầu chỉ hiện sau khi JavaScript chạy; bấm sớm hơn thì form gửi kiểu HTML thuần.
  await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Mật khẩu/).fill(password);
  await page.locator("form").getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible();
  await expect(page).toHaveURL(next);
}

test("đăng nhập bằng email", async ({ page }) => {
  await signIn(page, "/");
});

test("viết review", async ({ page }) => {
  const { filmSlug, userId } = testData();
  const title = "Bài review của E2E";
  const content = "Nội dung do test tự động viết, đủ dài hơn năm mươi ký tự để được đăng.";
  // Tên không được trùng giữa các lần chạy nên lấy một phần id tài khoản.
  const author = `E2E ${userId.slice(0, 8)}`;
  await signIn(page, `/phim/${filmSlug}/viet-review`);
  await page.getByLabel("Tên hiển thị").fill(author);
  await page.getByLabel("Điểm (1–10)").selectOption("8");
  await page.getByLabel("Tiêu đề").fill(title);
  await page.getByLabel(/^Nội dung/).fill(content);
  await page.getByRole("button", { name: "Đăng review" }).click();

  await expect(page).toHaveURL(new RegExp(`/review/${filmSlug}-[0-9a-f]{8}$`));
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("article").getByText(content)).toBeVisible();
  await expect(page.getByRole("article").getByText(author)).toBeVisible();
  expect(await rows(`reviews?select=title,score,status&author_id=eq.${userId}`)).toEqual([
    { title, score: 8, status: "published" },
  ]);
  // Mở lại để sửa: bài cũ phải được điền sẵn.
  await page.goto(`/phim/${filmSlug}/viet-review`);
  await expect(page.getByLabel("Tiêu đề")).toHaveValue(title);
  await expect(page.getByLabel(/^Nội dung/)).toHaveValue(content);
});

test("click affiliate được ghi", async ({ page, context }) => {
  const { filmId, filmSlug, optionId, userId, watchUrl } = testData();
  await signIn(page, `/phim/${filmSlug}`);
  // Link mở tab mới, nên chờ phản hồi ở cấp context. Chỉ cần lệnh chuyển hướng, không phụ thuộc trang đích.
  const [response] = await Promise.all([
    context.waitForEvent("response", (r) => new URL(r.url()).pathname === `/go/${optionId}`),
    page.locator(`a[href="/go/${optionId}"]`).click(),
  ]);
  expect(response.status()).toBe(302);
  expect((await response.allHeaders()).location).toBe(watchUrl);
  await expect
    .poll(() => rows(`affiliate_clicks?select=film_id,platform&user_id=eq.${userId}`))
    .toEqual([{ film_id: filmId, platform: "other" }]);
});
