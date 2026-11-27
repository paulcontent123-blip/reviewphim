import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/data/admin";

export default async function AdminHome() {
  await requireAdmin("/admin");
  redirect("/admin/phim");
}
