import { randomBytes } from "node:crypto";
import { assertPostingOn, createTestData, removeRun, removeStale } from "./data";

/** Tạo dữ liệu cho cả lần chạy; hàm trả về được Playwright gọi sau test, kể cả khi test lỗi. */
export default async function setup() {
  await assertPostingOn();
  await removeStale();
  const runId = randomBytes(4).toString("hex");
  try {
    process.env.E2E_DATA = JSON.stringify(await createTestData(runId));
  } catch (e) {
    await removeRun(runId);
    throw e;
  }
  return () => removeRun(runId);
}
