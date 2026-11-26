import { expect, test } from "@playwright/test";

// Tắt JavaScript của trang để giống lúc trang chưa tải xong.
test.use({ javaScriptEnabled: false });

test("form đăng nhập không gửi khi trang chưa sẵn sàng", async ({ page }) => {
  await page.goto("/dang-nhap");
  const sent: string[] = [];
  page.on("request", (r) => {
    if (r.isNavigationRequest()) sent.push(`${r.method()} ${r.url()}`);
  });
  const form = page.locator("form", { has: page.locator("input[name=password]") });
  const submit = form.getByRole("button", { name: "Đăng nhập" });
  await page.getByLabel("Email").fill("gia@example.com");
  await page.getByLabel(/^Mật khẩu/).fill("mat-khau-gia-123");

  await page.getByLabel(/^Mật khẩu/).press("Enter");
  await submit.click({ force: true });
  // Kiểm tra điều không được xảy ra, nên phải chờ một khoảng cố định.
  await page.waitForTimeout(1000);

  expect(sent).toEqual([]);
  await expect(page).toHaveURL("/dang-nhap");
  await expect(submit).toBeDisabled();
  // Lớp phòng hờ: nếu form vẫn bị gửi thì dữ liệu không nằm trên địa chỉ.
  await expect(form).toHaveAttribute("method", "post");
});
