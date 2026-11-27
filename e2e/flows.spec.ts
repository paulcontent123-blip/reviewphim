import { expect, test } from "@playwright/test";
import { rows, testData } from "./data";
import { signIn } from "./session";

test("đăng nhập bằng email", async ({ page }) => {
  await signIn(page, testData(), "/");
});

test("viết review", async ({ page }) => {
  const { filmSlug, userId } = testData();
  const title = "Bài review của E2E";
  const content = "Nội dung do test tự động viết, đủ dài hơn năm mươi ký tự để được đăng.";
  // Tên không được trùng giữa các lần chạy nên lấy một phần id tài khoản.
  const author = `E2E ${userId.slice(0, 8)}`;
  await signIn(page, testData(), `/phim/${filmSlug}/viet-review`);
  await page.getByLabel("Tên hiển thị").fill("admin");
  await page.getByLabel("Điểm (1–10)").selectOption("8");
  await page.getByLabel("Tiêu đề").fill(title);
  await page.getByLabel(/^Nội dung/).fill(content);
  await page.getByLabel(/^Tag/).fill("e2e, thử");
  await page.getByLabel("Bài có tiết lộ nội dung phim").check();
  await page.getByRole("button", { name: "Đăng review" }).click();

  // Server từ chối thì người viết không phải nhập lại.
  await expect(page.locator("form").getByRole("alert")).toHaveText("Tên này không được dùng.");
  await expect(page.getByRole("button", { name: "Đăng review" })).toBeEnabled();
  await expect(page.getByLabel("Tên hiển thị")).toHaveValue("admin");
  await expect(page.getByLabel("Điểm (1–10)")).toHaveValue("8");
  await expect(page.getByLabel("Tiêu đề")).toHaveValue(title);
  await expect(page.getByLabel(/^Nội dung/)).toHaveValue(content);
  await expect(page.getByLabel(/^Tag/)).toHaveValue("e2e, thử");
  await expect(page.getByLabel("Bài có tiết lộ nội dung phim")).toBeChecked();

  await page.getByLabel("Tên hiển thị").fill(author);
  await page.getByRole("button", { name: "Đăng review" }).click();

  await expect(page).toHaveURL(new RegExp(`/review/${filmSlug}-[0-9a-f]{8}$`));
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  // Bài đánh dấu spoiler nên phải bấm mới thấy nội dung.
  await page.getByText("Bài viết tiết lộ nội dung phim. Bấm để đọc tiếp.").click();
  await expect(page.getByRole("article").getByText(content)).toBeVisible();
  await expect(page.getByRole("article").getByText(author)).toBeVisible();
  expect(await rows(`reviews?select=title,score,status,spoiler,tags&author_id=eq.${userId}`)).toEqual([
    { title, score: 8, status: "published", spoiler: true, tags: ["e2e", "thử"] },
  ]);
  // Mở lại để sửa: bài cũ phải được điền sẵn.
  await page.goto(`/phim/${filmSlug}/viet-review`);
  await expect(page.getByLabel("Tiêu đề")).toHaveValue(title);
  await expect(page.getByLabel(/^Nội dung/)).toHaveValue(content);
});

test("click affiliate được ghi", async ({ page, context }) => {
  const { filmId, filmSlug, optionId, userId, watchUrl } = testData();
  await signIn(page, testData(), `/phim/${filmSlug}`);
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
