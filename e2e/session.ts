import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page, { email, password }: { email: string; password: string }, next: string) {
  await page.goto(`/dang-nhap?next=${encodeURIComponent(next)}`);
  // Nút trên thanh đầu chỉ hiện sau khi JavaScript chạy; bấm sớm hơn thì form gửi kiểu HTML thuần.
  await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Mật khẩu/).fill(password);
  await page.locator("form").getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible();
  await expect(page).toHaveURL(next);
}
