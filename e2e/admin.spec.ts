import { expect, test } from "@playwright/test";
import { rows, seedReview, testData } from "./data";
import { signIn } from "./session";

test("khách và người thường không vào được trang quản trị", async ({ page }) => {
  await page.goto("/admin/phim");
  await expect(page).toHaveURL(/\/dang-nhap\?next=/);
  await signIn(page, testData(), "/");
  await expect(page.getByRole("link", { name: "Quản trị" })).toHaveCount(0);
  const response = await page.goto("/admin/phim");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
});

test("admin thêm link, trang phim hiện ngay, rồi xóa", async ({ page }) => {
  const { admin, filmId, filmSlug, runId } = testData();
  const url = `https://example.com/?admin=${runId}`;
  const netflix = page.getByRole("link", { name: /Netflix/ });
  // Mở trước để trang phim nằm trong cache, sau đó kiểm tra nó được làm mới.
  await page.goto(`/phim/${filmSlug}`);
  await expect(netflix).toHaveCount(0);

  await signIn(page, admin, `/admin/phim?q=${runId}`);
  await page.getByRole("link", { name: new RegExp(`Phim thử ${runId}`) }).click();
  const add = page.getByRole("region", { name: "Thêm link" });
  await add.getByLabel("Địa chỉ link (https)").fill(url);
  await add.getByLabel("Nền tảng").selectOption("netflix");
  await add.getByRole("button", { name: "Thêm link" }).click();
  await expect(page.getByRole("heading", { name: "Link đang có (2)" })).toBeVisible();
  expect(await rows(`watch_options?select=platform&film_id=eq.${filmId}&url=eq.${encodeURIComponent(url)}`)).toEqual([
    { platform: "netflix" },
  ]);

  await page.goto(`/phim/${filmSlug}`);
  await expect(netflix).toBeVisible();

  await page.goto(`/admin/phim/${filmSlug}`);
  const item = page.getByRole("listitem", { name: "Netflix" });
  await item.getByRole("button", { name: "Xóa", exact: true }).click();
  await item.getByRole("button", { name: "Xóa hẳn link này" }).click();
  await expect(page.getByRole("heading", { name: "Link đang có (1)" })).toBeVisible();
  await page.goto(`/phim/${filmSlug}`);
  await expect(netflix).toHaveCount(0);
});

test("admin ẩn rồi hiện lại bài review", async ({ page }) => {
  const { admin, filmId, runId } = testData();
  const title = `[E2E] Bài duyệt ${runId}`;
  const slug = await seedReview(admin.id, filmId, title);
  const open = async () => (await page.goto(`/review/${slug}`))?.status();
  expect(await open()).toBe(200);

  await signIn(page, admin, "/admin/review");
  const card = page.getByRole("article", { name: title });
  await card.getByRole("button", { name: "Ẩn bài" }).click();
  await expect(card).toHaveCount(0);
  expect(await open()).toBe(404);

  await page.goto("/admin/review?trang-thai=an");
  await card.getByRole("button", { name: "Hiện lại" }).click();
  await expect(card).toHaveCount(0);
  expect(await open()).toBe(200);
});
