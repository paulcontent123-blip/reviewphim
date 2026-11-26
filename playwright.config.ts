import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { assertAllowedProject } from "./e2e/data";

// Trên máy đọc .env.local; CI đặt biến môi trường sẵn.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
// Kiểm tra trước khi build và trước mọi lệnh ghi.
assertAllowedProject();

const PORT = 3200;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  // Không ghi trace: trace chứa phiên đăng nhập của tài khoản thử.
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/robots.txt`,
    timeout: 300_000,
    reuseExistingServer: false,
  },
});
