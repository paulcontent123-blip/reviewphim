import { expect, test } from "@playwright/test";

test("chuyển giữa đăng nhập và đăng ký, lỗi cũ được xóa", async ({ page }) => {
  await page.goto("/dang-nhap");
  await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
  const choose = page.getByRole("group", { name: "Chọn đăng nhập hoặc đăng ký" });
  const form = page.locator("form", { has: page.locator("input[name=password]") });
  await expect(choose.getByRole("button", { name: "Đăng nhập" })).toHaveAttribute("aria-pressed", "true");

  // Sai mật khẩu chỉ đọc, không tạo dữ liệu.
  await page.getByLabel("Email").fill("khong-ton-tai@example.com");
  await page.getByLabel(/^Mật khẩu/).fill("mat-khau-sai-123");
  await form.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(form.getByRole("alert")).toHaveText("Email hoặc mật khẩu không đúng.");

  await choose.getByRole("button", { name: "Đăng ký" }).click();
  await expect(choose.getByRole("button", { name: "Đăng ký" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 1, name: "Tạo tài khoản" })).toBeVisible();
  await expect(form.getByRole("button", { name: "Đăng ký" })).toBeVisible();
  await expect(form.getByRole("alert")).toHaveCount(0);

  await choose.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Đăng nhập" })).toBeVisible();
});
